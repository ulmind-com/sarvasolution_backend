import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './config/swagger.js';
import errorHandler from './middlewares/errorHandler.js';
import routes from './routes/index.js';
import authRoutes from './routes/authRoutes.js';

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(helmet({
    contentSecurityPolicy: false, // Disable CSP to allow Swagger UI inline scripts and styles
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(morgan('dev'));

// Swagger Docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use('/api', routes);
app.use('/api/v1', authRoutes);

app.get('/', (req, res) => {
    res.send('API is running...');
});

// Error Handler
app.use(errorHandler);

export default app;
