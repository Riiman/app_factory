from flask import request
from flask_socketio import join_room, leave_room
from app.extensions import socketio

@socketio.on('connect')
def handle_connect():
    print(f'Client connected to global namespace: {request.sid}')

@socketio.on('disconnect')
def handle_disconnect():
    print(f'Client disconnected from global namespace: {request.sid}')

@socketio.on('join')
def on_join(data):
    room = data.get('room')
    if room:
        join_room(room)
        print(f"Client {request.sid} joined room: {room}")

@socketio.on('leave')
def on_leave(data):
    room = data.get('room')
    if room:
        leave_room(room)
        print(f"Client {request.sid} left room: {room}")
