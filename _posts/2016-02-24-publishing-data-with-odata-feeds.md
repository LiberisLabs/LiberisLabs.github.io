---
layout: post
title: Publishing data with OData feeds
categories:
tags: [ReST, .NET, OData, MongoDB ]
excerpt: How to publish readonly data sources with OData
author: Sakis
image:
canonical:
---
## When reporting is a pain...

Ever since I got into software business, a system's reporting capability has always been a pain either when it was the core of the system or being a nice to have feature. In our application, a distributed architecture comprised of several microservices supporting a workflow with different entry points, when the need for reporting became apparent heads started to scratch. And it wasn't the lack of skills that had us thinking about ways to expose the data to their stakeholders rather than the diversity and sometimes ambiguity of the reporting requirements (the "I want it ALL and I want it MY WAY" #agile data report).

## Why OData?

Why not OData? We use MongoDB for all data stores (it's a blasphemy to even mention SQL in our place) and our first thought was to use some sort of ODBC driver with SQL support to expose our _schemaless_ data. But then again, losing control of our system intrinsic processes by relying on black box components that came with a monthly bill, is enough incentive to stir our hacking/creative ingenuity.
So, OData is free and open source (Microsoft says...). In a sentence, it's a web protocol that allows publishing data over HTTP along with a description (**metadata**) of their structure and their relations to other entities.

Why bother with structure and references to other entities? **SHOW ME THE DATA!** Well, metadata information about the data are used by clients like Excel to reconstitute data schema in their own mysterious ways and hydrate/map the data on the other side of the wire. Excel is a buzzword in our business so it didn't take long to put two and two together.

## How did we do it...

...as simple as possible. We used WebAPI 2 and OData version 4 to build endpoints which exposed entities/resources as IQueryable. So, we gathered all POCO classes used to store data in our mongo databases across the system and build simple readonly repositories to hydrate them from their data sources:
```csharp
public class SomeEntityDataStore : IEntityDataStore
{
  private readonly IMongoDatabase _mongoDatabase;

  public SomeEntityDataStore(IMongoDatabase mongoDatabase)
  {
    _mongoDatabase = mongoDatabase;
  }

  public IQueryable<SomeEntity> GetAll()
  {
    return _mongoDatabase.GetCollection<SomeEntity>("someEntity").AsQueryable();   
  }
}
```
Connection strings for `mongoDatabase` were configured with `secondaryPreferred` option which basically channeled requests to secondary members in a mongodb server cluster if available. That way we take advantage of our replication strategy and off load OData read requests to the databases used less from our system.

Repositories like that were injected into `ODataControllers`:
```csharp
public class SomeEntityController : ODataController
{
    private readonly IEntityDataStore _store;

    public AuditorReportController(IEntityDataStore store)
    {
        _store = store;
    }

    [EnableQuery]
    public IHttpActionResult Get()
    {
        return Ok(_store.GetAll());
    }

    [EnableQuery]
    public IHttpActionResult Get([FromODataUri] string key)
    {
        return Ok(_store.GetAll().Where(entity => entity.Id == key));
    }
}
```
So, OData controllers supporting only HTTP GET requests expose the IQueryable source of some entity rendering them a readonly endpoint to that data source. An extra single result method was required to fetch entities by their id which is passed through the resource path. The `[EnableQuery]` marks the controller suitable to handle complex OData query expressions which are being passed from the client to the controller using querystring parameters. Thus, by exposing an IQueryable entity through an OData endpoint, query building becomes a responsibility of the client able to synthesize the OData query using expressions like `$filter`, `$select`, `$top`, `$skip` etc.

Finally, defining the routes. Our OWIN Startup class had nothing special, using just the `ODataConvetionModelBuilder` to describe our POCO classes to an Entity Data Model (EDM):
```csharp
public class Startup
{
  public void Configuration(IAppBuilder app)
  {
     var config = new HttpConfiguration();

     var builder = new ODataConventionModelBuilder();

     builder.EntitySet<SomeEntity>("SomeEntities");
     builder.EntitySet<SomeOtherEntity>("SomeOtherEntities");
     builder.EntitySet<AwesomeEntity>("AwesomeEntities");

     config.MapODataServiceRoute(
      routeName: "EntityRoute",
      routePrefix: "readOnlyOdata",
      model: builder.GetEdmModel());

     app.UseWebApi(config);
  }
}
```
Every `EntitySet` defined, map a route to their corresponding controllers. The EntitySet name is used as a resource path in the OData uri. Details about all endpoints uri can be found in the service document. If `http://odatafeed` is the address for our WebAPI project, hitting the service root `http://odatafeed/readOnlyOdata` will reply back with the service document. A JSON object listing the urls of the endpoints available e.g. `http://odatafeed/readOnlyOdata/SomeEntities` etc. Everything that follows after the service root up to querystring is the resource path used to navigate through the hierarchies defined in the EDM.

Apart from the service document which advertises the available entities to query via their endpoints urls, there's the metadata document which further describes EDM using Common Schema Language Definition (CSDL). CSDL is an XML like representation which OData protocol uses to describe the data types and their internal structure found in our POCO classes. Metadata document can be accessed with the `$metadata` keyword e.g. `http://odatafeed/readOnlyOdata/$metadata`. This document is used by ODataControllers to serialize data and transmit them over HTTP and the same document is used from clients to deserialize them on the other side.

## What's next

Well, we've just scratched the surface of the OData world using it as a simple readonly gateway for our data. Currently we are exploring OData query potentials by utilizing the feeds doing some analytical and BI voodoo in... Excel. Future Data Warehousing needs, will probably use the same feeds to design an SSIS data flow to pump data to SQL Server databases. What's more exciting is using OData sources in a Azure Machine Learning Studio experiments where data will be transformed and used to train machine learning algorithms to help our decisioning process.

Next steps will improve EntitySet definition by using a `CustomHttpControllerSelector` to discover and define Entities by namespaces and naming conventions. Maybe adopting a mode radical approach building EDM models dynamically using the structure of the collections in mongo databases. Hopefully, some good material for another blogpost...
