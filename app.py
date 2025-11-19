import eventlet
eventlet.monkey_patch()

from flask import Flask, render_template
from flask_socketio import SocketIO, emit
from sniffer import PacketSniffer

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app, async_mode='eventlet')

sniffer = None

@app.route('/')
def index():
    return render_template('index.html')

def packet_callback(data):
    socketio.emit('traffic_update', data)

@socketio.on('connect')
def test_connect():
    print('Client connected')
    global sniffer
    if sniffer is None:
        sniffer = PacketSniffer(packet_callback)
        sniffer.start()

@socketio.on('disconnect')
def test_disconnect():
    print('Client disconnected')

if __name__ == '__main__':
    print("Starting server at http://localhost:5000")
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)
