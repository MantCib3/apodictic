const config = {
    apiBaseUrl: process.env.NODE_ENV === 'production' 
        ? '/api' 
        : 'http://localhost:3001/api'
};

export default config;
