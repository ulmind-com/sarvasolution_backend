import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './config/swagger.js';
import errorHandler from './middlewares/errorHandler.js';
import routes from './routes/index.js';

const app = express();

/**
 * Standard Middlewares
 */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(morgan('dev'));

/**
 * documentation
 */
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/**
 * Centralized v1 Routes
 */
app.use('/api/v1', routes);

app.get('/', (req, res) => {
    res.json({ message: 'SarvaSolution Backend API is active' });
});

/**
 * Global Error Handling Middleware
 */
app.use(errorHandler);

export default app;
