"""
FastAPI proxy server that forwards all requests to the Node.js backend.
This is needed because supervisor is configured to run uvicorn/Python.
"""
import os
import sys
import subprocess
import asyncio
import threading
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, HTTPException, WebSocket
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
import httpx

# Store the Node.js process reference
node_process = None
NODE_BACKEND_URL = "http://localhost:8002"

def start_node_server():
    """Start the Node.js server process."""
    global node_process
    env = os.environ.copy()
    env['NODE_PORT'] = '8002'
    node_process = subprocess.Popen(
        ['node', 'server.js'],
        cwd='/app/backend',
        stdout=sys.stdout,
        stderr=sys.stderr,
        env=env
    )
    print(f"Node.js server started with PID: {node_process.pid}")

def stop_node_server():
    """Stop the Node.js server process."""
    global node_process
    if node_process:
        print("Stopping Node.js server...")
        node_process.terminate()
        try:
            node_process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            node_process.kill()
        print("Node.js server stopped")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage Node.js server lifecycle."""
    # Start Node.js server in a background thread
    thread = threading.Thread(target=start_node_server, daemon=True)
    thread.start()
    
    # Wait a bit for Node.js to start
    await asyncio.sleep(3)
    print("FastAPI proxy ready - Node.js backend should be running on port 8002")
    
    yield
    
    # Cleanup
    stop_node_server()

app = FastAPI(lifespan=lifespan)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"])
async def proxy(request: Request, path: str):
    """Proxy all requests to Node.js backend."""
    async with httpx.AsyncClient(timeout=60.0) as client:
        url = f"{NODE_BACKEND_URL}/{path}"
        
        # Forward query parameters
        if request.query_params:
            url += f"?{request.query_params}"
        
        try:
            # Get request body if present
            body = await request.body()
            
            # Build headers, excluding hop-by-hop headers
            headers = {}
            for key, value in request.headers.items():
                if key.lower() not in ('host', 'content-length', 'transfer-encoding', 'connection'):
                    headers[key] = value
            
            # Forward the request
            response = await client.request(
                method=request.method,
                url=url,
                headers=headers,
                content=body if body else None
            )
            
            # Build response headers
            resp_headers = {}
            for key, value in response.headers.items():
                if key.lower() not in ('content-encoding', 'transfer-encoding', 'content-length', 'connection'):
                    resp_headers[key] = value
            
            # Return the response
            return Response(
                content=response.content,
                status_code=response.status_code,
                headers=resp_headers,
                media_type=response.headers.get('content-type')
            )
        except httpx.ConnectError:
            raise HTTPException(status_code=503, detail="Node.js backend not available - please wait for it to start")
        except httpx.TimeoutException:
            raise HTTPException(status_code=504, detail="Request timeout")
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
