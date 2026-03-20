const http = require('http');

http.get('http://localhost:5000/api/reports/dashboard', (res) => {
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    res.on('end', () => {
        console.log('Status Code:', res.statusCode);
        console.log('Response:', data);
    });
}).on('error', (err) => {
    console.log('Error: ' + err.message);
});
