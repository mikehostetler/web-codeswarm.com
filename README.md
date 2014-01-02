# web-browserswarm.com
### a Sails application

## Developing with Vagrant

This project is set up to use Vagrant to set up a Virtual Machine to work from.

NOTE: You will need to also set up and install the BrowserSwarm repository for this project to work.

### Set up Vagrant (Only do this once)

1. Download and install VirtualBox by [clicking here](https://www.virtualbox.org/wiki/Downloads)
2. Download and install Vagrant by [clicking here](http://downloads.vagrantup.com/)
3. Clone this repository.
4. cd web-browserswarm.com/
5. vagrant up
6. Grab a cup of coffee while you wait for the server to download and install. This will take a little while depending on your internet connection.

### Once Vagrant as been set up

1. cd web-browserswarm.com/
2. `vagrant up` (skip this if Vagrant is already running)
3. `vagrant ssh` (Log into the Vagrant box)
4. `cd /vagrant` (Shared directory that maps to the local web-browserswarm.com directory)
5. `sails lift` (Sails.js command to start the Sails server)
6. Navigate to http://localhost:1337
  The network port from the Virtual Machine is forwarded to your localhost

## Browser debugging

Browser debugging messages use [bows](https://github.com/latentflip/bows).

For debugging messages to show up on browser console, do in console:

```javascript
localStorage.debug = true
```

To add debugging messages to any part of the code do:

```javascript
var log = require('bows')('my_module_name');

log('this is a message to be logged');
```

