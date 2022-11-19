# Gazelle Router

Gazelle is a tiny and incredibly fast Radix tree-based router.\
While designed for deno and deno deploy, it can be used with any environment.\
Provides an API that's familar to anybody who's used express or fastify before.\
By default it exports a Handler Router that expects Fetch API compliant request handlers, but it also exports a _naked_
Router that can hold a value of any type.

Written in TypeScript to be used with TypeScript.

## Usage

### HTTP Routing

The `mod.ts` file exports a `Router` class that is supposed to be used with Fetch API compliant environments in a
following manner:

```ts
import { Router, type RequestContext } from "https://deno.land/x/gazelle/mod.ts";
import { serve } from "https://deno.land/std/http/server.ts";

const notFoundHandler = (_req: Request, _ctx: RequestContext)
  => new Response(
    JSON.stringify({ status: 404, message: "Not Found" }),
    { status: 404, statusText: "Not Found" },
  );

const router = new Router({
  /* You can pass route declarations in the class constructor */
  routes: [{ 
    path: '/', 
    methods: ['GET'], 
    handler: (_req, _ctx) => new Response('hello world', { status: 200 })
  }],
  /* and handlers for 404 and 500 */
  notFoundHandler,
});

/* ***
 * You can use the same interface like the one used above
 * in the constructor to declare routes with the `.on()`
 * method, passing either an array or a single object
 * ***/
router.on({
 path: '/comments/:id',
 methods: ['GET', 'PATCH'],
 handler (req, ctx) => ...
})

/* ***
 * or use a param-based interface
 * ***/
router.on(
  '/comments/:id/author',
  'GET',
  (req, ctx) => {
    console.log(ctx.params);
    ...
  }
)

/* ***
 * or use a more traditional interface: 
 * class methods named after http methods.
 * ***/
router.get('/about', (req, ctx) => ...)

/* ***
 * You can then perform a manual lookup 
 * of the handler like so:
 * ***/
const matchedHandler = router.find('/about', 'GET');

/* ***
 * or at the end you can use the `.handle()` method to
 * return a request handler that shall perform all the
 * routing for you
 * ***/
await serve(router.handle());
```

### The _naked_ router

The Gazelle router can hold any value in the tree nodes - they don't have to be request handlers. This can be especially
useful if trying to use Gazelle as a router for a backend framework or even in the browser. For this usecase you can
import a `Router` class from `/src/router.ts`. You can then use a constructor type parameter to define the type of a
value to be stored in the tree nodes. Remember that by using the _naked_ router you loose the `.handle()` method and
have to fallback to using the `.find()` method youself.

```ts
import { Router } from 'https://deno.land/x/gazelle/src/router.ts';

const router = new Router<number>();

router.put('/item/:itemId', 42);

const lookupValue = router.find('/item/best-number-in-the-world', 'PUT');
/* ***
 * > {
 * >   params: { itemId: "best-number-in-the-world" },
 * >   value: 42
 * > }
 * ***/
```

## Maintainers

- Kamil H. Walkowicz ([@khwalkowicz](https://github.com/khwalkowicz))

## Other

### Contribution

Pull request, issues and feedback are very welcome. Code style is formatted with `deno fmt` and commit messages are done
following Conventional Commits spec.

### Licence

Copyright 2022, Kamil H. Walkowicz. All rights reserved. Distrubuted under the MIT license.
