#docker base image 

FROM ubuntu

#docker running commands and directory setup 

#WORKING DIRECTORY
WORKDIR /usr/app

#caching some files 

# COPY ./src/package.json /usr/app/src

#COPY THE REST OF THE FILES TO THE DOCKER FILE SYSTEM
COPY . .

RUN apt-get update && \
    apt-get install -y build-essential pip net-tools iputils-ping iproute2 curl

RUN curl -fsSl http://deb.nodesource.com/setup_16.x | bash -
RUN apt-get install -y nodejs 
RUN npm install -g watchify

RUN npm install ./src

#docker main commands on startup

EXPOSE 3000
EXPOSE 12555
EXPOSE 2000-2020
EXPOSE 10000-10100


