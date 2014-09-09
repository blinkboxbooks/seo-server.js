#!/bin/bash

# This script builds an RPM of the server web app within the web virtual machine and is 
# designed to be triggered after the server web app has been built and the 'dist' folder has been generated

source /home/vagrant/.bash_profile;

SSA_HOME=/vagrant/seo-server
RPM_HOME=/home/vagrant/rpmbuild

# initialse RPM structure
rm -rf ~/rpmbuild
rpmdev-setuptree

cd $SSA_HOME

# gather CWA version and build information
SSA_FULL_VERSION=$(grep version dist/package.json | awk -F\" '{print $(NF-1)}')
SSA_VERSION=$(echo $SSA_FULL_VERSION | cut -d'-' -f1)
SSA_BUILD_NUMBER=$(echo $SSA_FULL_VERSION | cut -d'-' -f2)

# prepare for building the RPM
cp rpm/seoserver.initd $RPM_HOME/SOURCES/seo-server-app-initd
cp rpm/logrotate $RPM_HOME/SOURCES

cp -r dist/ $RPM_HOME/SOURCES/seo-server-app-${SSA_VERSION}
cp rpm/ssa.spec $RPM_HOME/SPECS
cd $RPM_HOME/SOURCES
tar czf seo-server-app-${SSA_VERSION}.tar.gz seo-server-app-${SSA_VERSION}/

# build the RPM
echo -e 'T3amcI7y@BbB\n' | setsid rpmbuild --sign -ba $RPM_HOME/SPECS/ssa.spec --define "_gpg_path /vagrant/gpg.books.teamcity.dev" --define "_gpgbin /usr/bin/gpg" --define "_signature gpg" --define "_gpg_name TeamCity (Dirty Development Signing Key) <tm-books-itops@blinkbox.com>" --define "version $SSA_VERSION" --define "release $SSA_BUILD_NUMBER"

# copy the resulting RPM into the seo server app rpm folder for CI to pick up
cp $RPM_HOME/RPMS/noarch/seo-server-app-${SSA_VERSION}-${SSA_BUILD_NUMBER}.noarch.rpm $SSA_HOME/rpm

# Show RPM summary
rpm -qip $SSA_HOME/rpm/seo-server-app-${SSA_VERSION}-${SSA_BUILD_NUMBER}.noarch.rpm
