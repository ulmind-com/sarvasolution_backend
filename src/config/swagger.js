import swaggerJsdoc from 'swagger-jsdoc';

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'SarvaSolution Backend API',
            version: '1.0.0',
            description: 'API documentation for SarvaSolution backend',
        },
        servers: [
            {
                url: `http://localhost:${process.env.PORT || 8000}`,
                description: 'Local development server',
            },
            {
                url: 'https://sarvasolution-backend.onrender.com',
                description: 'Production server',
            },
        ],
    },
    apis: ['./src/docs/*.js', './src/routes/*.js'], // Path to the API docs
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
