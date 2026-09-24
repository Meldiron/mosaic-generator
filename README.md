# Mosaic Photo Generator

A Vue.js application that generates photo mosaics by combining a target image with a pool of smaller images. Built with Nuxt 3 and Tailwind CSS, this application processes images client-side using Web Workers for optimal performance. This project was created by v0, an advanced AI coding assistant.

This fork signs in with [Shoebox](https://shoebox.appwrite.network), a private photo gallery that is also an OAuth2 provider. The photos of the gallery you share are the mosaic pool, and the target photo is one of them. Deployed at https://mosaic.appwrite.network.

## Features

- Sign in with Shoebox and share one gallery
- Every photo of that gallery is the pool of images for the mosaic
- Pick any gallery photo as the target to be transformed into a mosaic
- Adjust tile size for the mosaic
- Adjust color balance between the original image and the mosaic tiles
- Cancel mosaic generation at any time
- Progress tracking during mosaic generation
- Dark mode toggle
- Responsive design that works on both desktop and mobile devices
- Download generated mosaic
- Collapsible "Important Information" section
- Tooltips for Tile Size and Color Adjustment parameters

## Recent Updates

- Replaced the file pickers with "Sign in with Shoebox" (OAuth 2.1 authorization code flow with PKCE)
- Pool photos are prepared once in the Web Worker (centred square thumbnails with cached average colours) so full-size gallery photos work; the target is capped at 2048px on its longest side
- Added a collapsible "Important Information" section using Headless UI components
- Implemented tooltips for Tile Size and Color Adjustment sliders
- Updated ChevronUpIcon import to use "@heroicons/vue/24/solid"
- Enhanced mosaic generation process in the Web Worker
- Improved error handling in the Web Worker
- Fixed issues with chunk processing in the Web Worker

## Mosaic Parameters

- **Tile Size**: Determines the size of each mosaic tile. Smaller values create more detailed mosaics but take longer to generate.
- **Color Adjustment**: Controls the balance between the original image colors and the mosaic tile colors. Higher values result in a mosaic that's closer to the original image colors.

## Sign in with Shoebox

`utils/shoebox.ts` is the whole integration. Shoebox is an Appwrite project
whose OAuth2 server is enabled, and this app is registered there as a
**public** client (`6ab512350005925f9297`), so it never holds a secret:

1. **Sign in with Shoebox** builds a PKCE verifier and challenge, stores them
   in `sessionStorage`, and sends the browser to the authorize endpoint with
   `scope=openid gallery.read`.
2. Shoebox shows its consent screen, where the user picks exactly one gallery
   (a Rich Authorization Request detail of type `gallery`).
3. Shoebox redirects back to this page with `?code=…&state=…`. On load the app
   swaps the code for an access token at the token endpoint, sending the PKCE
   verifier instead of a client secret, and cleans the URL.
4. With the token it calls Shoebox's gallery API
   (`https://shoebox-gallery-api.fra.appwrite.run`), which returns the shared
   gallery's photos as presigned URLs valid for an hour. All of them become the
   pool; clicking one makes it the target.

The token lives in `sessionStorage`, so it is gone when the tab closes.
**Sign out** just forgets it.

The redirect URI is the page itself, with a trailing slash. These must be
registered on the Shoebox client:

```
http://localhost:3000/
https://mosaic.appwrite.network/
```

Discovery document:
`https://fra.cloud.appwrite.io/v1/oauth2/6ab43a98000b9aedd03c/.well-known/openid-configuration`

## Deploy

The app is an Appwrite Site in the Shoebox project, built as a static Nuxt
site (`npm run generate`, output `.output/public`) and described in
`appwrite.config.json`. Redeploy with:

```sh
appwrite push site
```

## Prerequisites

Before you begin, ensure you have the following installed:

- Node.js (version 14.x or later)
- npm or yarn
- Git

## Project Setup

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd mosaic-generator

2. **Install dependencies**

    ```bash
    # Using npm
    npm install

    # Using yarn
    yarn install
    ```

3. **Start the development server**

    ```bash
    # Using npm
    npm run dev

    # Using yarn
    yarn dev
    ```

4. **Open your browser**

    Navigate to `http://localhost:3000` to see the application running.

## Project Structure

```plaintext
mosaic-generator/
├── pages/
│   └── index.vue      # Main application component
├── utils/
│   └── shoebox.ts     # Sign in with Shoebox (OAuth2 + PKCE) and the gallery API
├── public/
│   └── mosaic-worker.js    # Web Worker for image processing
├── nuxt.config.ts     # Nuxt configuration
├── appwrite.config.json # Appwrite Site definition for `appwrite push site`
└── package.json       # Project dependencies
```

## How It Works

### Main Logic

1. **Photos**

    1. The user signs in with Shoebox and shares one gallery
    2. Every photo in it is downloaded from a presigned URL and becomes the pool
    3. The target photo is whichever gallery photo the user clicks

2. **Mosaic Generation**

    1. The application divides the target image into small tiles
    2. For each tile, it:

        1. Calculates the average color
        2. Finds the best matching image from the pool
        3. Replaces the tile with the matching image

3. **Performance Optimization**

    1. Uses Web Workers for heavy computation
    2. Implements chunked data transfer to handle large images
    3. Provides progress updates during generation

### Technical Implementation

- **Web Worker**: Handles image processing in a separate thread to keep the UI responsive
- **Chunked Data Transfer**: Splits large images into 5MB chunks for efficient transfer
- **Canvas API**: Used for image manipulation and color analysis
- **Vue 3 Composition API**: Manages application state and UI updates
- **Headless UI**: Implements collapsible sections and tooltips

## Usage

1. **Sign in with Shoebox**

    1. Click "Sign in with Shoebox" and sign in to your Shoebox account
    2. On the consent screen, pick the gallery to share and click Allow
    3. You come back here with that gallery loaded; every photo in it is the pool

2. **Select Target Photo**

    1. Click one of the gallery photos; it is shown larger underneath

3. **Adjust Parameters**

    1. Use the sliders to set the tile size and color adjustment
    2. Click the "?" buttons for more information about each parameter

4. **Generate Mosaic**

    1. Click "Generate Mosaic" to start the process
    2. Watch the progress in the loading overlay
    3. Use the "Cancel Generation" button if you want to stop the process

5. **View and Download**

    1. Once complete, the mosaic will appear in the result section
    2. Click "Download Mosaic" to save the image

## Development

### Adding New Features

1. Modify `pages/index.vue` for UI changes
2. Update `public/mosaic-worker.js` for image processing logic
3. Test thoroughly with various image sizes and quantities

### Building for Production

    ```bash
    # Using npm
    npm run build
    npm run start

    # Using yarn
    yarn build
    yarn start
    ```

## Troubleshooting

If you encounter any issues with mosaic generation:

1. **Check the browser console for error messages or logs**
2. **Image Upload Issues**

    - Ensure images are in supported formats (PNG, JPEG)
    - Check file size limits in your browser

3. **Generation Performance**

    - Try using smaller tile sizes or fewer pool photos if the generation is taking too long
    - Use smaller target images for quicker results

4. **Browser Compatibility**

    - Ensure your browser supports Web Workers and modern JavaScript features
    - Try updating your browser to the latest version

5. **Clear browser cache and reload**
6. **Check for updates**

    - Make sure you're using the latest version of the application

If the issue persists, please report it by opening an issue on the project repository with a detailed description of the problem and steps to reproduce it.

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

This project uses various open-source libraries and tools. We thank the community for their contributions.

This project was created by v0, an advanced AI coding assistant developed by Vercel. v0 is designed to assist developers in creating efficient, modern web applications.

Made with ❤️ by the Mosaic Photo Generator Team
