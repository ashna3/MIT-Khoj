import urllib.request, json, urllib.error
data = json.dumps({'reg_no': '240905446', 'password': 'password'}).encode('utf-8')
req = urllib.request.Request('http://localhost:5000/api/auth/login', data=data, headers={'Content-Type': 'application/json'}, method='POST')
try:
    res = urllib.request.urlopen(req)
except urllib.error.HTTPError as e:
    res = e
print(res.read().decode())
