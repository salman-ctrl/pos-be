const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getSettings = async (req, res) => {
  try {
    let setting = await prisma.storeSetting.findFirst();

    if (!setting) {
        setting = await prisma.storeSetting.create({
            data: { 
                storeName: "Toko Saya",
                taxRate: 0,
                serviceCharge: 0
            }
        });
    }

    res.json({ success: true, data: setting });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const { 
        storeName, address, phone, email, website, 
        taxRate, serviceCharge, receiptFooter,
        enableCash, enableQris, enableDebit, autoPrintReceipt 
    } = req.body;

    const firstSetting = await prisma.storeSetting.findFirst();
    const id = firstSetting ? firstSetting.id : 0;

    const dataToUpdate = {};

    if (storeName) dataToUpdate.storeName = storeName;
    if (address) dataToUpdate.address = address;
    if (phone) dataToUpdate.phone = phone;
    if (email) dataToUpdate.email = email;
    if (website) dataToUpdate.website = website;
    if (receiptFooter) dataToUpdate.receiptFooter = receiptFooter;

    if (taxRate !== undefined) dataToUpdate.taxRate = parseFloat(taxRate);
    if (serviceCharge !== undefined) dataToUpdate.serviceCharge = parseFloat(serviceCharge);

    if (enableCash !== undefined) dataToUpdate.enableCash = enableCash === 'true' || enableCash === true;
    if (enableQris !== undefined) dataToUpdate.enableQris = enableQris === 'true' || enableQris === true;
    if (enableDebit !== undefined) dataToUpdate.enableDebit = enableDebit === 'true' || enableDebit === true;
    if (autoPrintReceipt !== undefined) dataToUpdate.autoPrintReceipt = autoPrintReceipt === 'true' || autoPrintReceipt === true;

    if (req.file) {
        dataToUpdate.logoUrl = req.file ? req.file.path : null;;
    }

    const updated = await prisma.storeSetting.upsert({
        where: { id: id },
        update: dataToUpdate,
        create: {
            storeName: storeName || "Toko Baru",
            ...dataToUpdate
        }
    });

    res.json({ success: true, message: "Pengaturan berhasil disimpan", data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};