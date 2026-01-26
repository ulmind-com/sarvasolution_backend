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
            },
        ],
    },
    apis: ['./src/docs/*.json', './src/routes/*.js'], // Path to the API docs
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
