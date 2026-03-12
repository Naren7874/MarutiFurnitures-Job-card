# Maruti Furniture — GCP Deployment Guide

This guide describes how to deploy the Maruti Furniture project to Google Cloud Platform (GCP).

## One-Time Setup (Already Completed)
- [x] Create GCP Project: `maruti-furniture-prod`
- [x] Enable APIs (Cloud Run, Artifact Registry, Storage)
- [x] Create Artifact Registry Repo: `maruti-furniture-repo` (Region: `asia-south1`)
- [x] Create GCS Bucket: `gs://maruti-furniture-frontend-prod`

---

## 🏗️ Backend Deployment (Cloud Run)

### 1. Build and Push Docker Image
Run these commands from the `server/` directory:

```bash
# 1. Login & Configure Docker
gcloud auth configure-docker asia-south1-docker.pkg.dev

# 2. Build local image
cd /home/narendra/Desktop/MarutiFurniture/server
docker build -t asia-south1-docker.pkg.dev/maruti-furniture-prod/maruti-furniture-repo/maruti-backend:latest .

# 3. Push to Artifact Registry
docker push asia-south1-docker.pkg.dev/maruti-furniture-prod/maruti-furniture-repo/maruti-backend:latest
```

### 2. Deploy to Cloud Run
The first time you deploy, you must set the secrets:

```bash
gcloud run deploy maruti-furniture-backend \
  --image asia-south1-docker.pkg.dev/maruti-furniture-prod/maruti-furniture-repo/maruti-backend:latest \
  --region asia-south1 \
  --platform managed \
  --allow-unauthenticated \
  --memory 1Gi \
  --cpu 1 \
  --set-secrets="MONGO_URI=MONGO_URI:latest,JWT_SECRET=JWT_SECRET:latest,CLOUDINARY_CLOUD_NAME=CLOUDINARY_CLOUD_NAME:latest,CLOUDINARY_API_KEY=CLOUDINARY_API_KEY:latest,CLOUDINARY_API_SECRET=CLOUDINARY_API_SECRET:latest" \
  --project maruti-furniture-prod
```

---

## 🎨 Frontend Deployment (CDN + GCS)

### 1. Build Client
Update `client/.env.production` with your Backend URL first!

```bash
cd /home/narendra/Desktop/MarutiFurniture/client
npm run build
```

### 2. Sync to Bucket
```bash
cd /home/narendra/Desktop/MarutiFurniture
gsutil -m rsync -r -d client/dist gs://maruti-furniture-frontend-prod/
```

### 3. Invalidate CDN Cache (If using Load Balancer)
```bash
gcloud compute url-maps invalidate-cdn-cache maruti-furniture-lb --path "/*" --project maruti-furniture-prod
```

---

## 🔑 Environment Variables & Secrets
The following secrets should be created in **GCP Secret Manager**:
- `MONGO_URI`
- `JWT_SECRET`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `EMAIL_HOST` / `USER` / `PASS`
