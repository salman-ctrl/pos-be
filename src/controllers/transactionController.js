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
        // Ambil bagian angka urut (index ke 2), hapus suffix unik jika ada
        const parts = lastTransaction.invoiceNumber.split('/');
        if (parts.length >= 3) {
            const cleanSeq = parts[2].split('-')[0];
            sequence = parseInt(cleanSeq) + 1;
        }
    }

    /**
     * UNIQ SUFFIX LOGIC: 
     * Kita tambahkan 3 karakter random di belakang agar jika request gagal dan diulang,
     * Midtrans tidak menganggap ID ini sudah pernah digunakan.
     */
    const randomSuffix = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `INV/${todayStr}/${String(sequence).padStart(4, '0')}-${randomSuffix}`;
};

/**
 * 1. CREATE TRANSACTION (CHECKOUT)
 */
exports.createTransaction = async (req, res) => {
    try {
        const { userId, customerId, items, payment } = req.body;

        if (!items || items.length === 0) return res.status(400).json({ success: false, message: "Keranjang kosong!" });

        const result = await prisma.$transaction(async (tx) => {
            let subTotal = 0;
            const transactionItemsData = [];
            const itemDetailsForMidtrans = [];

            for (const item of items) {
                const product = await tx.product.findUnique({ where: { id: item.productId } });

                if (!product || !product.isActive) throw new Error(`Produk tidak valid.`);
                if (product.stock < item.qty) throw new Error(`Stok ${product.name} kurang.`);

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
                        description: 'Penjualan Kasir'
                    }
                });
            }

            const setting = await tx.storeSetting.findFirst();
            const taxRate = setting?.taxRate ? Number(setting.taxRate) / 100 : 0;
            const taxAmount = Math.round(subTotal * taxRate);
            const grandTotal = subTotal + taxAmount;

            // Generate Invoice unik agar tidak bentrok di Midtrans
            const invoiceNumber = await generateInvoiceNumber(tx);

            // Masukkan pajak ke detail Midtrans (PENTING: Agar jumlah item == gross_amount)
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
                } catch (midtransErr) {
                    // Jika tetap error, kita throw agar Prisma melakukan rollback stok
                    throw new Error(`Midtrans: ${midtransErr.message}`);
                }
            }

            return { ...newTransaction, midtransToken, midtransUrl };
        });

        res.status(201).json({ success: true, message: "Transaksi diproses!", data: result });

    } catch (error) {
        console.error("❌ Transaction Error:", error.message);
        res.status(400).json({ success: false, message: error.message });
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
                include: { user: { select: { name: true } }, customer: { select: { name: true } }, payments: true },
                orderBy: { createdAt: 'desc' },
                skip,
                take: parseInt(limit)
            }),
            prisma.transaction.count({ where: whereClause })
        ]);

        res.json({ success: true, data: transactions, meta: { total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) } });
    } catch (error) {
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
        if (!transaction) return res.status(404).json({ success: false, message: "Transaksi tidak ditemukan" });
        const storeSettings = await prisma.storeSetting.findFirst();
        res.json({ success: true, data: transaction, store: storeSettings });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * 4. WEBHOOK HANDLER
 */
exports.handleMidtransNotification = async (req, res) => {
    try {
        console.log("🔔 [WEBHOOK] Midtrans Received:", req.body);
        const notification = await snap.transaction.notification(req.body);
        const orderId = notification.order_id;
        const transactionStatus = notification.transaction_status;
        const fraudStatus = notification.fraud_status;

        let newStatus = '';
        if (transactionStatus === 'capture') {
            if (fraudStatus === 'challenge') newStatus = 'PENDING';
            else if (fraudStatus === 'accept') newStatus = 'PAID';
        } else if (transactionStatus === 'settlement') {
            newStatus = 'PAID';
        } else if (transactionStatus === 'cancel' || transactionStatus === 'deny' || transactionStatus === 'expire') {
            newStatus = 'CANCELLED';
        } else if (transactionStatus === 'pending') {
            newStatus = 'PENDING';
        }

        if (newStatus) {
            await prisma.transaction.update({
                where: { invoiceNumber: orderId },
                data: { status: newStatus }
            });

            await prisma.payment.updateMany({
                where: { transaction: { invoiceNumber: orderId } },
                data: {
                    paymentStatus: newStatus === 'PAID' ? 'SETTLEMENT' : newStatus,
                    referenceId: notification.transaction_id
                }
            });
            console.log(`✅ [WEBHOOK] Invoice ${orderId} synced: ${newStatus}`);
        }
        res.status(200).json({ status: 'OK' });
    } catch (error) {
        console.error("❌ [WEBHOOK ERROR]:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};