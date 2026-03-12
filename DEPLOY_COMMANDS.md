# Maruti Furniture - Deployment Commands

Save this file. Whenever you change code in the project, run the commands below to push the updates to the live server.

## 🛠️ Updating the Backend (Server)
If you modify anything in the `server/` folder (like adding a new API route, changing PDF templates, or updating the database schema), open a terminal and run these commands **one by one**:

```bash
# 1. Navigate to the server folder
cd /home/narendra/Desktop/MarutiFurniture/server

# 2. Build the new Docker image (Make sure Docker is running on your machine)
docker build -t asia-south1-docker.pkg.dev/maruti-furniture-prod/maruti-furniture-repo/maruti-backend:latest .

# 3. Push the image up to Google Cloud Artifact Registry
docker push asia-south1-docker.pkg.dev/maruti-furniture-prod/maruti-furniture-repo/maruti-backend:latest

# 4. Tell Cloud Run to pull the new image and deploy it live
gcloud run deploy maruti-furniture-backend \
  --image asia-south1-docker.pkg.dev/maruti-furniture-prod/maruti-furniture-repo/maruti-backend:latest \
  --region asia-south1 \
  --project maruti-furniture-prod
```
*(The backend deployment takes about 2-3 minutes total. There will be zero downtime for users while it's deploying.)*

---

## 🎨 Updating the Frontend (Client)
If you modify anything in the `client/` folder (React pages, CSS, components, etc.), open a terminal and run these commands:

```bash
# 1. Navigate to the client folder
cd /home/narendra/Desktop/MarutiFurniture/client

# 2. Build the optimized production files
npm run build

# 3. Sync the new files to the Google Cloud Storage bucket (the CDN)
gsutil -m rsync -r -d dist gs://maruti-furniture-frontend-prod/
```
*(The frontend deployment requires no downtime. Because the Load Balancer uses a global CDN, it might take a few minutes for users around the world to see the absolute newest changes.)*

---

### Helpful Links
- **Your Frontend**: `https://jobcard.marutifurniture.com`
- **Your API URL**: `https://maruti-furniture-backend-43053062057.asia-south1.run.app`
- **GCP Console URL**: `https://console.cloud.google.com/?project=maruti-furniture-prod`
