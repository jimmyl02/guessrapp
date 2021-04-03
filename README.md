## Guessr.App

This is a song guessing game which uses spotify playlists.

The core technologies are Node.JS with WebSockets and Express for development and Kubernetes with GKE for deployment. For all Javascript components I chose to use TypeScript as it offers some nice features and strict typing which is then compiled to Javascript. React for the frontend interacts with the game manager using WebSockets. This is also a monorepo which uses yarn workspaces which places all dependencies in root. 

The manifests used to deploy to GKE are in the kubernetes folder. There is also a script to build and upload the upload to Google Cloud Artifacts which is then pulled from the Kubernetes deployment.

Overall, this was a chance to learn how to build games using Node.JS and WebSockets as well as how to manage the game with WebSockets in the React frontend. Furthermore, I wanted to learn how to actually deploy to GKE and use Kubernetes after seeing the awesome work done with rCTF so I took the opportunity to deploy it as well.

### Node.JS Details

To bootstrap the TypeScript repo, I used a previous project [PulseEngine-Backend](https://github.com/jimmyl02/PulseEngine-Backend) and took the majority of the structure. This serves as a pretty good baseline for REST APIs but as this is a game, the service needs to be stateful. To keep it simple and with horizontal scalability in mind, the WebSocket server intercepts messages and pushes it to Redis. Then, the one server which is hosting the game would handle the event and publish another event which is received and pushed to the client. If you are looking to implement websockets the server package shows a structure that I found works pretty well.

### React Details

The React app was interesting as I used TypeScript with React. It offers some strict types but I didn't use it as much as I did for the server. This was bootstraped with create-react-app's TypeScript configuration. The interesting part of this app is the Room container which handles WebSocket messages. There was an interesting design pattern which is to `useEffect()` with isConnected as a dependency. This seems like a great way to detect when WebSocket disconnects. Other than that, it is pretty standard frontend logic.

### Deployment Details

This was my first time deploying with Kubernetes after going through [this course](https://www.edx.org/course/introduction-to-kubernetes). I also referenced a lot of the GKE docs and rCDS which give guidance on how to deploy. First, we must build and upload the image to Google Cloud artifact registry. This is done with the buildpushimage.sh script. Then we must apply the manifests to tell GKE how we want our deployment. The redis deployment uses a ClusterIP service as it should be internal only while the app deployment uses a NodePort. This is then exposed with the Ingress load balancer. Finally, I proxy the loadbalancer through cloudflare to add SSL and DDOS protection.