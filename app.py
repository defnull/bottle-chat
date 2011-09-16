import gevent.monkey
gevent.monkey.patch_all()
import bottle
from bottle import request, response, static_file, run
import collections
from time import time
from gevent import sleep

messages = collections.deque()

MESSAGE_TIMEOUT = 10
FLOOD_MESSAGES = 5
FETCH_FREQ = 1000

class Message(object):
    def __init__(self, nick, text):
        self.time = time()
        self.nick = nick
        self.text = text

    def json(self):
        return {'text': self.text, 'nick': self.nick, 'time': self.time}

js = '''

'''

app = bottle.Bottle()

@app.get('/')
@app.get('/:channel')
def on_index(channel='lobby'):
    return static_file('index.html', root='./static/')

@app.get('/static/:filename#.*#')
def on_static(filename):
    return static_file(filename, root='./static/')

@app.get('/api/info')
def on_info():
    return {
        'server_name': 'Bottle Test Chat',
        'server_time': time(),
        'refresh_interval': 1000
    }

@app.post('/api/send_message')
def on_message():
    text = request.forms.get('text', '')
    nick = request.forms.get('nick', '')
    if ':' in nick: nick, token = nick.split(':', 1)
    else:           token = ''
    nick = nick.strip()

    if not text: return {'error': 'No text.'}
    if not nick: return {'error': 'No nick.'}

    # Garbage collection (delete old messages from cache)
    timeout = time()-MESSAGE_TIMEOUT
    while messages and messages[0].time < timeout:
        messages.popleft()

    # Flood protection
    if len([m for m in messages if m.nick == nick]) > FLOOD_MESSAGES:
        return {'error': 'Messages arrive too fast.'}

    messages.append(Message(nick, text))
    return {'status': 'OK'}

@app.get('/api/fetch')
def on_fetch():
    ''' Return all messages of the last ten seconds. '''
    since = float(request.params.get('since', 0))
    # Fetch new messages
    updates = [m.json() for m in messages if m.time > since]
    # Send up to 10 messages at once.
    return { 'messages': updates[:10] }

bottle.debug(True)
bottle.run(app, server='wsgiref', port=8080, host='0.0.0.0', reloader=True)