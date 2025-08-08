import 'dart:io';
import 'dart:convert';

void main() async {
  // Create HTTP server on localhost port 8080
  final server = await HttpServer.bind('localhost', 8080);
  print('Server running on http://localhost:8080');

  // Listen for requests
  await for (HttpRequest request in server) {
    handleRequest(request);
  }
}

void handleRequest(HttpRequest request) {
  final response = request.response;
  
  // Set CORS headers
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type');

  // Handle different routes
  switch (request.uri.path) {
    case '/':
      handleHome(request, response);
      break;
    case '/api/users':
      handleUsers(request, response);
      break;
    case '/api/time':
      handleTime(request, response);
      break;
    default:
      handle404(request, response);
      break;
  }
}

void handleHome(HttpRequest request, response) {
  response.headers.contentType = ContentType.html;
  response.write('''
    <!DOCTYPE html>
    <html>
    <head>
        <title>Simple Dart Server</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            .container { max-width: 600px; margin: 0 auto; }
            .endpoint { background: #f5f5f5; padding: 10px; margin: 10px 0; border-radius: 5px; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🎯 Simple Dart Server</h1>
            <p>Server is running successfully!</p>
            
            <h2>Available Endpoints:</h2>
            <div class="endpoint">
                <strong>GET /</strong> - This home page
            </div>
            <div class="endpoint">
                <strong>GET /api/users</strong> - Get list of users
            </div>
            <div class="endpoint">
                <strong>GET /api/time</strong> - Get current server time
            </div>
        </div>
    </body>
    </html>
  ''');
  response.close();
}

void handleUsers(HttpRequest request, response) {
  response.headers.contentType = ContentType.json;
  
  if (request.method == 'GET') {
    // Sample users data
    final users = [
      {'id': 1, 'name': 'علی احمدی', 'email': 'ali@example.com'},
      {'id': 2, 'name': 'فاطمه محمدی', 'email': 'fateme@example.com'},
      {'id': 3, 'name': 'حسن رضایی', 'email': 'hassan@example.com'},
    ];
    
    response.write(jsonEncode({
      'success': true,
      'data': users,
      'count': users.length
    }));
  } else {
    response.statusCode = HttpStatus.methodNotAllowed;
    response.write(jsonEncode({
      'success': false,
      'message': 'Method not allowed'
    }));
  }
  
  response.close();
}

void handleTime(HttpRequest request, response) {
  response.headers.contentType = ContentType.json;
  
  final now = DateTime.now();
  response.write(jsonEncode({
    'success': true,
    'timestamp': now.millisecondsSinceEpoch,
    'datetime': now.toIso8601String(),
    'formatted': '${now.year}/${now.month}/${now.day} ${now.hour}:${now.minute}:${now.second}'
  }));
  
  response.close();
}

void handle404(HttpRequest request, response) {
  response.statusCode = HttpStatus.notFound;
  response.headers.contentType = ContentType.json;
  
  response.write(jsonEncode({
    'success': false,
    'message': 'Endpoint not found',
    'path': request.uri.path
  }));
  
  response.close();
}
