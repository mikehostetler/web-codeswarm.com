Vagrant::Config.run do |config|
  config.vm.box = "precise32"
  
  config.vm.box_url = "http://files.vagrantup.com/precise32.box"

  config.vm.forward_port 1337, 1337

	config.vm.customize ["setextradata", :id, "VBoxInternal2/SharedFoldersEnableSymlinksCreate/app", "1"]

  config.vm.provision :chef_solo do |chef|
    chef.add_recipe "nodejs"
    chef.add_recipe "mongodb-debs"
    chef.json = {
      "nodejs" => {
        "version" => "0.10.12"
      }
    }
  end

$script = <<SCRIPT
sudo apt-get install -y build-essential --no-install-recommends
sudo apt-get install -y redis-server --no-install-recommends
sudo apt-get install -y ruby1.9.1-dev --no-install-recommends
sudo apt-get install -y ruby1.9.3 --no-install-recommends
sudo gem install cf

sudo apt-get install -y git git-core phantomjs

sudo npm install -g forever nodemon sails

cd /vagrant
npm install 

SCRIPT

	config.vm.provision "shell", inline: $script

end
