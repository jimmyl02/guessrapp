#!/bin/bash

# build and push to gcr
#docker build -t us-west2-docker.pkg.dev/guessrapp/app/app:0.4 .
#gcloud auth configure-docker us-west2-docker.pkg.dev
#docker push us-west2-docker.pkg.dev/guessrapp/app/app:0.4

# build and push to docker hub
docker build -t jimmyl02/guessrapp:latest .
docker push jimmyl02/guessrapp:latest
