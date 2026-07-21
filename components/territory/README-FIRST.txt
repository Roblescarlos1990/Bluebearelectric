BLUE BEAR ELECTRIC — STATIC HTML INSTALLATION

This is the correct version for the repository shown in your screenshots.
It does not require React, Next.js, npm, or a build process.

STEP 1 — REPLACE THE CURRENT TERRITORY FOLDER

Inside your repository, open:

components\territory

Remove these two incompatible React files:

BlueBearTerritory.tsx
BlueBearTerritory.module.css

Copy these items from this package into components\territory:

territory.css
territory.js
territory-snippet.html
images\

STEP 2 — OPEN YOUR HOMEPAGE

Open the file named "index" with the Microsoft Edge icon. Windows is hiding the
extension; that file is index.html. Open it using Visual Studio Code or Notepad.

STEP 3 — ADD THE STYLESHEET

Find the closing </head> tag. Directly ABOVE it, paste:

<link rel="stylesheet" href="components/territory/territory.css">

STEP 4 — CHOOSE WHERE THE ZONE APPEARS

Inside the <body>, find the existing section after which the territory should
appear. Paste this on a new line:

<div id="blue-bear-territory"></div>

STEP 5 — ADD THE SCRIPT

Find the closing </body> tag at the bottom of index.html. Directly ABOVE it,
paste:

<script src="components/territory/territory.js"></script>

Save index.html, then open it in Microsoft Edge. No import statement is used.

The phone buttons are currently connected to (760) 540-9527.
