## Deployment using Kubernetes

Each of the *-deploysvc.yaml contains the deployment and service config for that service.

Make a copy of secrets-template.yaml and rename it to secrets.yaml. Replace the values with the actual secret values.

To apply the changes to a cluster, use `kubectl apply -f ./name.yaml`.