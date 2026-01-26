const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getStockHistory = async (req, res) => {
  try {
    const history = await prisma.stockMovement.findMany({
        include: {
            product: { 
                select: { 
                    name: true, 
                    sku: true,
                    category: { select: { name: true } }
                } 
            }
        },
        orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: history });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.stockAdjustment = async (req, res) => {
  try {
    const { productId, type, qty, description } = req.body;

    if (!qty || parseInt(qty) <= 0) {
        return res.status(400).json({ message: "Jumlah harus lebih dari 0" });
    }

    await prisma.$transaction(async (tx) => {
        const product = await tx.product.findUnique({ where: { id: parseInt(productId) } });
        if (!product) throw new Error("Produk tidak ditemukan");

        let newStock = product.stock;
        if (type === 'IN') newStock += parseInt(qty);
        else if (type === 'OUT') newStock -= parseInt(qty);

        if (newStock < 0) throw new Error("Stok tidak boleh minus");

        await tx.product.update({
            where: { id: parseInt(productId) },
            data: { stock: newStock }
        });

        await tx.stockMovement.create({
            data: {
                productId: parseInt(productId),
                type: type,
                qty: parseInt(qty),
                source: type === 'IN' ? 'PURCHASE' : 'ADJUSTMENT', 
                description: description || 'Manual Adjustment'
            }
        });
    });

    res.json({ success: true, message: "Stok berhasil disesuaikan" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};