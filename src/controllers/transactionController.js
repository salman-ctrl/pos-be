const { PrismaClient } = require('@prisma/client');
const midtransClient = require('midtrans-client');
const prisma = new PrismaClient();

// Inisialisasi Midtrans Snap
const snap = new midtransClient.Snap({
    isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
    serverKey: process.env.MIDTRANS_SERVER_KEY
});

/**
 * HELPER: Generate Invoice Number Otomatis dengan Suffix Unik
 * Menghindari error 'Order ID already taken' di Midtrans.
 */
const generateInvoiceNumber = async (tx) => {
    const date = new Date();
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}${mm}${dd}`;

    const lastTransaction = await tx.transaction.findFirst({
        where: { invoiceNumber: { contains: `INV/${todayStr}` } },
        orderBy: { id: 'desc' }
    });

    let sequence = 1;
    if (lastTransaction) {
        const parts = lastTransaction.invoiceNumber.split('/');
        if (parts.length >= 3) {
            const cleanSeq = parts[2].split('-')[0];
            sequence = parseInt(cleanSeq) + 1;
        }
    }

    const randomSuffix = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `INV/${todayStr}/${String(sequence).padStart(4, '0')}-${randomSuffix}`;
};

/**
 * 1. CREATE TRANSACTION (CHECKOUT)
 */
exports.createTransaction = async (req, res) => {
    try {
        const { userId, customerId, items, payment } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({ success: false, message: "Keranjang kosong!" });
        }

        const result = await prisma.$transaction(async (tx) => {
            let subTotal = 0;
            const transactionItemsData = [];
            const itemDetailsForMidtrans = [];

            // Validasi produk dan hitung total
            for (const item of items) {
                const product = await tx.product.findUnique({ where: { id: item.productId } });

                if (!product || !product.isActive) {
                    throw new Error(`Produk tidak valid.`);
                }
                if (product.stock < item.qty) {
                    throw new Error(`Stok ${product.name} tidak mencukupi.`);
                }

                const price = Number(product.price);
                subTotal += price * item.qty;

                transactionItemsData.push({
                    productId: product.id,
                    qty: item.qty,
                    price: product.price,
                    costPrice: product.costPrice
                });

                itemDetailsForMidtrans.push({
                    id: product.sku || product.id.toString(),
                    price: Math.round(price),
                    quantity: item.qty,
                    name: product.name.substring(0, 50)
                });
            }

            // Hitung pajak
            const setting = await tx.storeSetting.findFirst();
            const taxRate = setting?.taxRate ? Number(setting.taxRate) / 100 : 0;
            const taxAmount = Math.round(subTotal * taxRate);
            const grandTotal = subTotal + taxAmount;

            // Generate Invoice unik
            const invoiceNumber = await generateInvoiceNumber(tx);

            // Tambahkan pajak ke item details Midtrans
            if (taxAmount > 0) {
                itemDetailsForMidtrans.push({
                    id: 'TAX-PPN',
                    price: taxAmount,
                    quantity: 1,
                    name: `Pajak (PPN ${setting.taxRate || 0}%)`
                });
            }

            const initialStatus = payment.type === 'CASH' ? 'PAID' : 'PENDING';
            const paymentStatus = payment.type === 'CASH' ? 'SETTLEMENT' : 'PENDING';

            // ✅ HANYA KURANGI STOCK JIKA PAYMENT = CASH
            if (payment.type === 'CASH') {
                for (const item of items) {
                    const product = await tx.product.findUnique({
                        where: { id: item.productId }
                    });

                    await tx.product.update({
                        where: { id: product.id },
                        data: { stock: product.stock - item.qty }
                    });

                    await tx.stockMovement.create({
                        data: {
                            productId: product.id,
                            type: 'OUT',
                            qty: item.qty,
                            source: 'SALE',
                            description: `Penjualan Cash - ${invoiceNumber}`
                        }
                    });
                }
            }

            // Buat transaksi
            const newTransaction = await tx.transaction.create({
                data: {
                    userId: parseInt(userId),
                    customerId: customerId ? parseInt(customerId) : null,
                    invoiceNumber,
                    subTotal,
                    taxAmount,
                    discountAmount: 0,
                    grandTotal,
                    status: initialStatus,
                    items: { create: transactionItemsData },
                    payments: {
                        create: {
                            paymentType: payment.type,
                            amount: grandTotal,
                            paymentStatus: paymentStatus
                        }
                    }
                },
                include: { items: true, payments: true }
            });

            let midtransToken = null;
            let midtransUrl = null;

            // Buat transaksi Midtrans jika bukan CASH
            if (payment.type !== 'CASH') {
                const parameter = {
                    transaction_details: {
                        order_id: invoiceNumber,
                        gross_amount: Math.round(grandTotal)
                    },
                    item_details: itemDetailsForMidtrans,
                    credit_card: { secure: true },
                    enabled_payments: ['gopay', 'other_qris', 'shopeepay']
                };

                try {
                    const transaction = await snap.createTransaction(parameter);
                    midtransToken = transaction.token;
                    midtransUrl = transaction.redirect_url;

                    console.log('✅ Midtrans transaction created:', invoiceNumber);
                } catch (midtransErr) {
                    console.error('❌ Midtrans Error:', midtransErr.message);
                    throw new Error(`Gagal membuat payment link: ${midtransErr.message}`);
                }
            }

            return { ...newTransaction, midtransToken, midtransUrl };
        }, {
            timeout: 10000
        });

        res.status(201).json({
            success: true,
            message: "Transaksi berhasil dibuat!",
            data: result
        });

    } catch (error) {
        console.error("❌ Transaction Error:", error.message);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * 2. GET ALL TRANSACTIONS
 */
exports.getAllTransactions = async (req, res) => {
    try {
        const { page = 1, limit = 10, status, search } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const whereClause = {};

        if (status) whereClause.status = status;
        if (search) whereClause.invoiceNumber = { contains: search };

        const [transactions, total] = await prisma.$transaction([
            prisma.transaction.findMany({
                where: whereClause,
                include: {
                    user: { select: { name: true } },
                    customer: { select: { name: true } },
                    payments: true
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: parseInt(limit)
            }),
            prisma.transaction.count({ where: whereClause })
        ]);

        res.json({
            success: true,
            data: transactions,
            meta: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error("❌ Get Transactions Error:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * 3. GET TRANSACTION BY ID
 */
exports.getTransactionById = async (req, res) => {
    try {
        const { id } = req.params;
        const transaction = await prisma.transaction.findUnique({
            where: { id: parseInt(id) },
            include: {
                user: { select: { name: true } },
                customer: { select: { name: true, phone: true } },
                items: { include: { product: { select: { name: true, sku: true } } } },
                payments: true
            }
        });

        if (!transaction) {
            return res.status(404).json({
                success: false,
                message: "Transaksi tidak ditemukan"
            });
        }

        const storeSettings = await prisma.storeSetting.findFirst();
        res.json({
            success: true,
            data: transaction,
            store: storeSettings
        });
    } catch (error) {
        console.error("❌ Get Transaction Error:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * 4. WEBHOOK HANDLER - PENTING: Ini yang sinkronkan status payment
 */
exports.handleMidtransNotification = async (req, res) => {
    try {
        console.log("🔔 [WEBHOOK] Midtrans notification received");
        console.log("Body:", JSON.stringify(req.body, null, 2));

        const notification = await snap.transaction.notification(req.body);
        const orderId = notification.order_id;
        const transactionStatus = notification.transaction_status;
        const fraudStatus = notification.fraud_status;
        const transactionId = notification.transaction_id;

        console.log(`📋 Order: ${orderId} | Status: ${transactionStatus} | Fraud: ${fraudStatus}`);

        // Cari transaksi
        const transaction = await prisma.transaction.findUnique({
            where: { invoiceNumber: orderId },
            include: { items: true, payments: true }
        });

        if (!transaction) {
            console.error('❌ Transaction not found:', orderId);
            return res.status(404).json({ success: false, message: 'Transaction not found' });
        }

        // Mapping status
        let newStatus = '';
        let paymentStatus = '';

        if (transactionStatus === 'capture') {
            if (fraudStatus === 'challenge') {
                newStatus = 'PENDING';
                paymentStatus = 'PENDING';
            } else if (fraudStatus === 'accept') {
                newStatus = 'PAID';
                paymentStatus = 'SETTLEMENT';
            }
        } else if (transactionStatus === 'settlement') {
            newStatus = 'PAID';
            paymentStatus = 'SETTLEMENT';
        } else if (transactionStatus === 'cancel' || transactionStatus === 'deny' || transactionStatus === 'expire') {
            newStatus = 'CANCELLED';
            paymentStatus = 'FAILED';
        } else if (transactionStatus === 'pending') {
            newStatus = 'PENDING';
            paymentStatus = 'PENDING';
        }

        if (!newStatus) {
            console.log('⚠️  Unknown status, skipping update');
            return res.status(200).json({ status: 'OK', message: 'Unknown status' });
        }

        // Update database dalam satu transaksi
        await prisma.$transaction(async (tx) => {
            // Update transaction status
            await tx.transaction.update({
                where: { invoiceNumber: orderId },
                data: { status: newStatus }
            });

            // ✅ Update payment status - PERBAIKAN QUERY
            await tx.payment.updateMany({
                where: { transactionId: transaction.id },
                data: {
                    paymentStatus: paymentStatus,
                    referenceId: transactionId
                }
            });

            // ✅ JIKA PAID, KURANGI STOCK (untuk non-CASH payment)
            if (newStatus === 'PAID' && transaction.status !== 'PAID') {
                console.log('💰 Payment confirmed! Reducing stock...');

                for (const item of transaction.items) {
                    const product = await tx.product.findUnique({
                        where: { id: item.productId }
                    });

                    if (product) {
                        await tx.product.update({
                            where: { id: item.productId },
                            data: { stock: product.stock - item.qty }
                        });

                        await tx.stockMovement.create({
                            data: {
                                productId: item.productId,
                                type: 'OUT',
                                qty: item.qty,
                                source: 'SALE',
                                description: `Penjualan QRIS/Digital - ${orderId}`
                            }
                        });

                        console.log(`  ✓ ${product.name}: ${product.stock} → ${product.stock - item.qty}`);
                    }
                }
            }

            // ✅ JIKA CANCELLED/EXPIRED, CEK APAKAH PERLU ROLLBACK STOCK
            if (newStatus === 'CANCELLED' && transaction.status === 'PAID') {
                console.log('🔄 Transaction cancelled after payment, restoring stock...');

                // Cari stock movements yang terkait
                const movements = await tx.stockMovement.findMany({
                    where: {
                        description: { contains: orderId },
                        type: 'OUT'
                    }
                });

                for (const movement of movements) {
                    const product = await tx.product.findUnique({
                        where: { id: movement.productId }
                    });

                    if (product) {
                        await tx.product.update({
                            where: { id: movement.productId },
                            data: { stock: product.stock + movement.qty }
                        });

                        await tx.stockMovement.create({
                            data: {
                                productId: movement.productId,
                                type: 'IN',
                                qty: movement.qty,
                                source: 'RETURN',
                                description: `Rollback pembatalan - ${orderId}`
                            }
                        });

                        console.log(`  ✓ Restored ${product.name}: ${product.stock} → ${product.stock + movement.qty}`);
                    }
                }
            }
        });

        console.log(`✅ [WEBHOOK] Invoice ${orderId} updated: ${newStatus}`);
        res.status(200).json({ status: 'OK' });

    } catch (error) {
        console.error("❌ [WEBHOOK ERROR]:", error.message);
        console.error(error.stack);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * 5. CHECK STATUS MANUAL (untuk debugging)
 */
exports.checkTransactionStatus = async (req, res) => {
    try {
        const { invoiceNumber } = req.params;

        // Check di Midtrans
        const statusResponse = await snap.transaction.status(invoiceNumber);
        console.log('Midtrans Status:', statusResponse);

        // Update database
        const transaction = await prisma.transaction.findUnique({
            where: { invoiceNumber: invoiceNumber },
            include: { payments: true, items: true }
        });

        if (!transaction) {
            return res.status(404).json({
                success: false,
                message: 'Transaksi tidak ditemukan'
            });
        }

        let newStatus = '';
        let paymentStatus = '';

        if (statusResponse.transaction_status === 'settlement') {
            newStatus = 'PAID';
            paymentStatus = 'SETTLEMENT';
        } else if (statusResponse.transaction_status === 'pending') {
            newStatus = 'PENDING';
            paymentStatus = 'PENDING';
        } else if (['cancel', 'deny', 'expire'].includes(statusResponse.transaction_status)) {
            newStatus = 'CANCELLED';
            paymentStatus = 'FAILED';
        }

        if (newStatus && transaction.status !== newStatus) {
            await prisma.$transaction(async (tx) => {
                await tx.transaction.update({
                    where: { invoiceNumber: invoiceNumber },
                    data: { status: newStatus }
                });

                await tx.payment.updateMany({
                    where: { transactionId: transaction.id },
                    data: {
                        paymentStatus: paymentStatus,
                        referenceId: statusResponse.transaction_id
                    }
                });

                // Kurangi stock jika baru jadi PAID
                if (newStatus === 'PAID' && transaction.status !== 'PAID') {
                    for (const item of transaction.items) {
                        const product = await tx.product.findUnique({
                            where: { id: item.productId }
                        });

                        if (product) {
                            await tx.product.update({
                                where: { id: item.productId },
                                data: { stock: product.stock - item.qty }
                            });

                            await tx.stockMovement.create({
                                data: {
                                    productId: item.productId,
                                    type: 'OUT',
                                    qty: item.qty,
                                    source: 'SALE',
                                    description: `Manual Check - ${invoiceNumber}`
                                }
                            });
                        }
                    }
                }
            });
        }

        res.json({
            success: true,
            message: 'Status checked and updated',
            data: {
                midtransStatus: statusResponse.transaction_status,
                databaseStatus: newStatus,
                updated: transaction.status !== newStatus
            }
        });

    } catch (error) {
        console.error('❌ Check Status Error:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

module.exports = exports;