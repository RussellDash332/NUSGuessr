# NUSGuessr
Letting Firebase Studio cook something simple?

## Getting Started

To get started, take a look at `src/app/page.tsx`.

## Running Locally

To run this application on your local machine, follow these steps:

1.  **Install Dependencies:**
    Open your terminal and run the following command to install all the necessary packages.
    ```bash
    npm install
    ```

2.  **Start the Development Server:**
    After the installation is complete, run this command to start the app.
    ```bash
    npm run dev
    ```

Your application should now be running at [http://localhost:9002](http://localhost:9002).

## Deploying to GitHub Pages

This project is configured to automatically deploy to GitHub Pages when you push changes to the `main` branch.

To complete the setup, follow these steps:

1.  **Update `next.config.ts`**:
    Open the `next.config.ts` file and replace `<repository-name>` in the `basePath` property with the name of your GitHub repository. For example, if your repository URL is `https://github.com/your-username/my-awesome-app`, you would change it to `basePath: '/my-awesome-app'`.

2.  **Configure GitHub Pages**:
    - Go to your repository's settings on GitHub.
    - Navigate to the "Pages" section in the sidebar.
    - Under "Build and deployment", select **GitHub Actions** as the "Source".

After your first push to the `main` branch, the workflow will run and deploy your site. You'll find the public URL in the "Pages" settings.