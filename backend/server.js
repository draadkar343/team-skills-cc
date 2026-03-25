require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const skillRoutes = require('./routes/skillRoutes');
const timesheetRoutes = require('./routes/timesheetRoutes');
const squadRoutes = require('./routes/squadRoutes');
const adminRoutes = require('./routes/adminRoutes');
const jobRoleRoutes = require('./routes/jobRoleRoutes');
const auditRoutes = require('./routes/auditRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/skills', skillRoutes);
app.use('/api/v1/timesheets', timesheetRoutes);
app.use('/api/v1/squads', squadRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/job-roles', jobRoleRoutes);
app.use('/api/v1/audit', auditRoutes);

app.get('/api/v1/health', (_req, res) => res.json({ status: 'ok' }));

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`API running on port ${PORT}`));
