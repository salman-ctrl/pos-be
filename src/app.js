const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./config/swagger');

const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const customerRoutes = require('./routes/customerRoutes');
const transactionRoutes = require('./routes/transactionRoutes'); 
const reportRoutes = require('./routes/reportRoutes');
const settingRoutes = require('./routes/settingRoutes'); 
const userRoutes = require('./routes/userRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/transactions', transactionRoutes); 
app.use('/api/reports', reportRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/users', userRoutes);
app.use('/api/inventory', inventoryRoutes);

app.get('/', (req, res) => {
  res.json({ message: "🚀 POS Backend Service is Running!", timestamp: new Date() });
});

app.get('/api/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ database: "CONNECTED ✅", server: "ONLINE 🟢" });
  } catch (error) {
    res.status(500).json({ database: "DISCONNECTED ❌", error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`\n✅ Server berjalan di: http://localhost:${PORT}`);
  console.log(`📄 Dokumentasi API: http://localhost:${PORT}/api-docs\n`);
});