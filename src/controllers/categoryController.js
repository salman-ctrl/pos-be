const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getAllCategories = async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
        include: { 
            products: {
                select: { 
                    stock: true,
                    transactionItems: {
                        where: { transaction: { status: 'PAID' } },
                        select: { qty: true, price: true, transaction: { select: { createdAt: true } } }
                    }
                } 
            }
        },
        orderBy: { createdAt: 'desc' }
    });

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const formattedData = categories.map(cat => {
        const productCount = cat.products.length;
        const totalStock = cat.products.reduce((sum, item) => sum + item.stock, 0);

        let revenueThisMonth = 0;
        let revenueLastMonth = 0;

        cat.products.forEach(prod => {
            prod.transactionItems.forEach(item => {
                const date = new Date(item.transaction.createdAt);
                const itemTotal = Number(item.price) * item.qty;

                if (date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
                    revenueThisMonth += itemTotal;
                }
                const isLastMonth = currentMonth === 0 
                    ? (date.getMonth() === 11 && date.getFullYear() === currentYear - 1)
                    : (date.getMonth() === currentMonth - 1 && date.getFullYear() === currentYear);
                
                if (isLastMonth) revenueLastMonth += itemTotal;
            });
        });

        let growthPercent = 0;
        if (revenueLastMonth > 0) {
            growthPercent = ((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100;
        } else if (revenueThisMonth > 0) {
            growthPercent = 100;
        }
        const growthString = (growthPercent >= 0 ? '+' : '') + growthPercent.toFixed(0) + '%';

        return {
            id: cat.id,
            name: cat.name,
            imageUrl: cat.imageUrl,
            displayType: cat.displayType,
            productCount,
            totalStock,
            growth: growthString
        };
    });

    res.json({ success: true, data: formattedData });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.createCategory = async (req, res) => {
  try {
    const { name, displayType } = req.body;
    const imageUrl = req.file ? req.file.path : null;
    const category = await prisma.category.create({ 
        data: { 
            name,
            imageUrl,
            displayType: displayType || 'normal'
        } 
    });
    res.status(201).json({ success: true, message: "Kategori berhasil dibuat", data: category });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, displayType } = req.body;
    
    const dataToUpdate = {};
    if (name) dataToUpdate.name = name;
    if (displayType) dataToUpdate.displayType = displayType;
    if (req.file) dataToUpdate.imageUrl = `/uploads/${req.file.filename}`;

    const category = await prisma.category.update({
        where: { id: parseInt(id) },
        data: dataToUpdate
    });

    res.json({ success: true, message: "Kategori berhasil diupdate", data: category });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.category.delete({ where: { id: parseInt(id) } });
    res.json({ success: true, message: "Kategori berhasil dihapus" });
  } catch (error) {
    res.status(500).json({ success: false, error: "Gagal menghapus (kategori sedang digunakan)" });
  }
};