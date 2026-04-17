# Arogya Kubernetes Manifests (Minikube)

This folder contains a Kubernetes deployment equivalent for the compose setup using:

- Deployments
- ClusterIP Services
- Per-service ConfigMaps and Secrets
- Single NGINX Ingress entrypoint

## Prerequisites

1. Minikube started
2. NGINX ingress addon/controller installed
3. Images available on Docker Hub:
   - imadhifham/api-gateway:v1
   - imadhifham/auth-service:v1
   - imadhifham/appointment-service:v1
   - imadhifham/telemedicine-service:v1
   - imadhifham/notification-service:v1
   - imadhifham/frontend:v1

## Apply Order

```bash
kubectl apply -f k8s/base/namespace.yaml
kubectl apply -f k8s/configmaps/
kubectl apply -f k8s/secrets/
kubectl apply -f k8s/auth/
kubectl apply -f k8s/appointment/
kubectl apply -f k8s/gateway/
kubectl apply -f k8s/telemedicine/
kubectl apply -f k8s/notification/
kubectl apply -f k8s/frontend/
kubectl apply -f k8s/ingress/
```

## Validate

```bash
kubectl get pods -n arogya
kubectl get svc -n arogya
kubectl get ingress -n arogya
```

## Minikube Ingress Access

If needed:

```bash
minikube addons enable ingress
minikube tunnel
```

Then use:

```bash
kubectl get ingress -n arogya
```

## Notes

1. Datastores are assumed external in this manifest set.
2. Update all `CHANGE_ME_*` secret values before deploying.
3. The gateway Deployment is configured with 2 replicas as the critical service.
