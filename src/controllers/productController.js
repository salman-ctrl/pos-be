const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Helper: Generate SKU Otomatis (Format: PROD-0001)
const generateAutoSKU = async () => {
  const lastProduct = await prisma.product.findFirst({
    orderBy: { id: 'desc' }
  });
  const nextId = lastProduct ? lastProduct.id + 1 : 1;
  return `PROD-${String(nextId).padStart(4, '0')}`;
};

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
    let { sku, name, price, costPrice, stock, categoryId, isActive, displayType } = req.body;

    // Handle SKU Otomatis jika kosong
    if (!sku || sku.trim() === "" || sku === "undefined") {
      sku = await generateAutoSKU();
    } else {
      const existing = await prisma.product.findUnique({ where: { sku: sku.toUpperCase() } });
      if (existing) return res.status(400).json({ success: false, message: "SKU sudah digunakan!" });
    }

    // Ambil URL Cloudinary dari req.file.path (Wajib link HTTPS/HTTP)
    const imageUrl = req.file ? req.file.path : null;

    const product = await prisma.product.create({
      data: {
        sku: sku.toUpperCase(),
        name,
        price: parseFloat(price) || 0,
        costPrice: parseFloat(costPrice) || 0,
        stock: parseInt(stock) || 0,
        categoryId: categoryId && categoryId !== "undefined" ? parseInt(categoryId) : null,
        isActive: isActive === 'true' || isActive === true,
        displayType: displayType || 'normal',
        imageUrl: imageUrl
      }
    });

    res.status(201).json({ success: true, message: "Produk berhasil dibuat", data: product });
  } catch (error) {
    console.error("CREATE ERROR:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, sku, price, costPrice, stock, categoryId, isActive, displayType } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (sku) {
      const existing = await prisma.product.findFirst({
        where: { sku: sku.toUpperCase(), NOT: { id: parseInt(id) } }
      });
      if (existing) return res.status(400).json({ success: false, message: "SKU sudah digunakan produk lain!" });
      updateData.sku = sku.toUpperCase();
    }

    if (price) updateData.price = parseFloat(price);
    if (costPrice) updateData.costPrice = parseFloat(costPrice);
    if (stock !== undefined) updateData.stock = parseInt(stock);
    if (categoryId) updateData.categoryId = parseInt(categoryId);
    if (displayType) updateData.displayType = displayType;
    if (isActive !== undefined) updateData.isActive = isActive === 'true' || isActive === true;

    // Hanya ganti foto jika ada file baru yang diupload
    if (req.file) {
      updateData.imageUrl = req.file.path;
    }

    const product = await prisma.product.update({
      where: { id: parseInt(id) },
      data: updateData
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