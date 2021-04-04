#!/bin/bash

docker build -t us-west2-docker.pkg.dev/guessrapp/app/app:0.3 .

gcloud auth configure-docker us-west2-docker.pkg.dev

docker push us-west2-docker.pkg.dev/guessrapp/app/app:0.3
