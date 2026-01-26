import dotenv from 'dotenv';
dotenv.config();

const Configs = {
    PORT: process.env.PORT || 8000,
    MONGO_URI: process.env.MONGO_URI,
    NODE_ENV: process.env.NODE_ENV || 'development',
}

export default Configs;