#!/bin/bash -x

ssh root@warrnambool.pozi.com "cd /var/lib/tomcat6/webapps/warrnambool-mobile && git pull origin master"

