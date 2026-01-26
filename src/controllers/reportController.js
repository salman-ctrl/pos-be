const { PrismaClient } = require('@prisma/client');
const { Parser } = require('json2csv'); 
const prisma = new PrismaClient();

exports.getDashboardStats = async (req, res) => {
    try {
        const { period = 'week' } = req.query;

        const today = new Date();
        const startOfToday = new Date(today.setHours(0, 0, 0, 0));
        
        const todayTransactions = await prisma.transaction.aggregate({
            _sum: { grandTotal: true },
            _count: { id: true },
            where: {
                createdAt: { gte: startOfToday },
                status: 'PAID'
            }
        });

        const todayItems = await prisma.transactionItem.findMany({
            where: {
                transaction: { createdAt: { gte: startOfToday }, status: 'PAID' }
            },
            select: { price: true, costPrice: true, qty: true }
        });

        const grossProfit = todayItems.reduce((acc, item) => {
            const profit = Number(item.price) - Number(item.costPrice);
            return acc + (profit * item.qty);
        }, 0);


        let chartData = [];
        let startDateChart, endDateChart;

        if (period === 'year') {
            const currentYear = new Date().getFullYear();
            startDateChart = new Date(currentYear, 0, 1); 
            endDateChart = new Date(currentYear, 11, 31); 

            const yearTrans = await prisma.transaction.findMany({
                where: {
                    createdAt: { gte: startDateChart, lte: endDateChart },
                    status: 'PAID'
                },
                select: { createdAt: true, grandTotal: true }
            });

            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
            const monthlyData = new Array(12).fill(0);

            yearTrans.forEach(t => {
                const monthIndex = new Date(t.createdAt).getMonth();
                monthlyData[monthIndex] += Number(t.grandTotal);
            });

            chartData = months.map((label, idx) => ({
                label,
                total: monthlyData[idx]
            }));

        } else if (period === 'month') {
            const date = new Date();
            const year = date.getFullYear();
            const month = date.getMonth();
            startDateChart = new Date(year, month, 1);
            endDateChart = new Date(year, month + 1, 0); 

            const monthTrans = await prisma.transaction.findMany({
                where: {
                    createdAt: { gte: startDateChart, lte: endDateChart },
                    status: 'PAID'
                },
                select: { createdAt: true, grandTotal: true }
            });

            const daysInMonth = endDateChart.getDate();
            const dailyData = new Array(daysInMonth).fill(0);

            monthTrans.forEach(t => {
                const dayIndex = new Date(t.createdAt).getDate() - 1; 
                dailyData[dayIndex] += Number(t.grandTotal);
            });

            chartData = dailyData.map((total, idx) => ({
                label: (idx + 1).toString(),
                total
            }));

        } else {
            const days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
            
            for (let i = 6; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                d.setHours(0,0,0,0);
                
                const nextDay = new Date(d);
                nextDay.setDate(d.getDate() + 1);

                const dailySum = await prisma.transaction.aggregate({
                    _sum: { grandTotal: true },
                    where: {
                        createdAt: { gte: d, lt: nextDay },
                        status: 'PAID'
                    }
                });

                chartData.push({
                    date: d.toISOString().split('T')[0],
                    label: days[d.getDay()],
                    total: Number(dailySum._sum.grandTotal) || 0
                });
            }
        }

        const topProductsRaw = await prisma.transactionItem.groupBy({
            by: ['productId'],
            _sum: { qty: true },
            where: {
                transaction: {
                    createdAt: { gte: startDateChart || new Date(new Date().setDate(new Date().getDate() - 7)) }, 
                    status: 'PAID'
                }
            },
            orderBy: { _sum: { qty: 'desc' } },
            take: 5
        });

        const topProducts = await Promise.all(topProductsRaw.map(async (item) => {
            const product = await prisma.product.findUnique({ 
                where: { id: item.productId },
                select: { name: true, imageUrl: true }
            });
            return {
                name: product?.name || 'Unknown',
                imageUrl: product?.imageUrl,
                sold: item._sum.qty
            };
        }));

        const lowStockProducts = await prisma.product.findMany({
            where: { stock: { lte: 10 }, isActive: true },
            select: { id: true, name: true, stock: true, imageUrl: true },
            take: 5,
            orderBy: { stock: 'asc' }
        });

        res.json({
            success: true,
            data: {
                summary: {
                    todayRevenue: Number(todayTransactions._sum.grandTotal) || 0,
                    todayCount: todayTransactions._count.id || 0,
                    grossProfit: grossProfit || 0,
                    lowStockCount: lowStockProducts.length
                },
                chart: chartData,
                filterUsed: period,
                topProducts: topProducts,
                lowStockProducts: lowStockProducts
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.exportTransactionReport = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({ message: "Tanggal mulai dan akhir wajib diisi!" });
        }

        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59);

        const transactions = await prisma.transaction.findMany({
            where: {
                createdAt: {
                    gte: start,
                    lte: end
                },
                status: 'PAID' 
            },
            include: {
                user: { select: { name: true } },
                customer: { select: { name: true } }, 
                payments: { select: { paymentType: true } } 
            },
            orderBy: { createdAt: 'desc' }
        });

        if (transactions.length === 0) {
            return res.status(404).json({ message: "Tidak ada data pada rentang tanggal ini." });
        }

       
        const reportData = transactions.map(t => ({
            'No Invoice': t.invoiceNumber,
            'Tanggal': t.createdAt.toISOString().split('T')[0],
            'Waktu': t.createdAt.toLocaleTimeString('id-ID'),
            'Kasir': t.user?.name || 'Admin',
            'Pelanggan': t.customer?.name || 'Umum',
            'Metode Bayar': t.payments[0]?.paymentType || 'CASH',
            'Subtotal': Number(t.subTotal),
            'Pajak': Number(t.taxAmount),
            'Diskon': Number(t.discountAmount),
            'Total Bayar': Number(t.grandTotal)
        }));

        const fields = ['No Invoice', 'Tanggal', 'Waktu', 'Kasir', 'Pelanggan', 'Metode Bayar', 'Subtotal', 'Pajak', 'Diskon', 'Total Bayar'];
        const json2csvParser = new Parser({ fields });
        const csv = json2csvParser.parse(reportData);

        res.header('Content-Type', 'text/csv');
        res.header('Content-Disposition', `attachment; filename=Laporan_Penjualan_${startDate}_${endDate}.csv`);
        res.status(200).send(csv);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Gagal export data", error: error.message });
    }
};