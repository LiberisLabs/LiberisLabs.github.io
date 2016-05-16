---
layout: post
title: "Writing plugins for Angular 2"
categories:
tags: [angular2, typescript, npm, plugins]
excerpt: Writing plugins for Angular 2 is not obvious. This post goes through setting up a plugin project and best practices.
author: Matt
image:
canonical:
---

# Background
Here at Liberis Labs we are always aiming to use the latest
and greatest technologies available to us. We were tasked with
building a new admin system for our teams on the front line.
Having full control of the environment and users meant that we were
free to choose whatever tech we wanted.

Enter Angular 2. 

Angular 2 uses TypeScript, and leans very heavily on ES6 modules. Which
sounds like it should make writing modules to integrate with Angular 2 an
absolute breeze. However, upon attempting to write my own module I encountered
many gotchas and pitfalls.

After spending some time in the Angular 2 Gitter, I've seen a few people
asking similar questions, and thought I'd write up what I've learnt from
attempting this myself.

Note before continuing, Angular 2 is still very much in beta. The
latest release at the time of writing is 2.0.0-rc.1, and things are
still *very* much subject to change.

# Creating a plugin
For this project we are going to create a basic Counter service. This
assumed a Unix style command line.

First we need to create our directory structure, initialise our NPM
project and (optional, but recommended) initialise a git repository.

```bash
mkdir counter
cd $_
git init 
```

Rather than using `npm init` to create our package.json, because there 
are a couple of important points to note, we are going to use the below
package.json as our starting point.

```json
{
  "name": "@LiberisLabs/counter",
  "version": "1.0.0",
  "main": "dist/index.js",
  "typings": "dist/index.d.ts"
}
```

Adding a typings field will ensure that projects that consume your plugin
will be able to understand the types involved in your plugin.

Next we need a tsconfig.json to instruct the TypeScript compiler how to
compile our plugin.

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "declaration": "true",
    "outDir": "dist"
  },

  "files": [
   "typings/browser.d.ts",
   "src/index.ts"
  ]
}
```

And finally, while you don't have to use it, I highly suggest using `typings`
to manage any type dependencies your package may require.