const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getAllProducts = async (req, res) => {
  try {
    const { search, category_id } = req.query;
    const whereClause = {}; 

    if (search) whereClause.name = { contains: search };
    if (category_id) whereClause.categoryId = parseInt(category_id);

    const products = await prisma.product.findMany({
        where: whereClause,
        include: { category: true },
        orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: products });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.createProduct = async (req, res) => {
  try {
    const { sku, name, price, costPrice, stock, categoryId, isActive, displayType } = req.body;
    const imageUrl = req.file ? req.file.path : null;
    const existing = await prisma.product.findUnique({ where: { sku } });
    if (existing) return res.status(400).json({ success: false, message: "SKU sudah digunakan!" });

    const isActiveBool = isActive === 'true' || isActive === true;

    const product = await prisma.product.create({
        data: {
            sku,
            name,
            price: parseFloat(price),
            costPrice: parseFloat(costPrice),
            stock: parseInt(stock),
            categoryId: parseInt(categoryId),
            isActive: isActiveBool,
            displayType: displayType || 'normal', 
            imageUrl
        }
    });

    res.status(201).json({ success: true, message: "Produk berhasil dibuat", data: product });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    
    if (data.price) data.price = parseFloat(data.price);
    if (data.costPrice) data.costPrice = parseFloat(data.costPrice);
    if (data.stock) data.stock = parseInt(data.stock);
    if (data.categoryId) data.categoryId = parseInt(data.categoryId);
    
    if (data.isActive !== undefined) {
        data.isActive = data.isActive === 'true' || data.isActive === true;
    }

    if (req.file) {
        data.imageUrl = `/uploads/${req.file.filename}`;
    }

    if (data.displayType) {
        data.displayType = data.displayType;
    }

    delete data.description;

    const product = await prisma.product.update({
        where: { id: parseInt(id) },
        data: data
    });

    res.json({ success: true, message: "Produk berhasil diupdate", data: product });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.product.delete({ where: { id: parseInt(id) } }); 
    res.json({ success: true, message: "Produk berhasil dihapus" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};