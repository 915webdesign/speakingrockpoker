"""
Backend wrapper to start Node.js server via supervisor.
This file acts as a bridge since supervisor is configured to run Python.
"""
import subprocess
import sys
import os
import signal

def main():
    # Change to backend directory
    os.chdir('/app/backend')
    
    # Start Node.js server
    process = subprocess.Popen(
        ['node', 'server.js'],
        cwd='/app/backend',
        stdout=sys.stdout,
        stderr=sys.stderr,
        env={**os.environ}
    )
    
    # Handle signals to properly terminate Node.js process
    def signal_handler(signum, frame):
        process.terminate()
        process.wait()
        sys.exit(0)
    
    signal.signal(signal.SIGTERM, signal_handler)
    signal.signal(signal.SIGINT, signal_handler)
    
    # Wait for Node.js process to complete
    process.wait()
    sys.exit(process.returncode)

if __name__ == '__main__':
    main()
