---
layout: post
title: "Sharing Large Messages Between Your Services with MassTransit and MongoDb"
categories:
tags: [Microservices, Messaging, MassTransit, MongoDB, GridFS, Document, Storage, FinTech]
excerpt: Publishing messages with large payloads can clog up your message transport. We explain how we can store large messages in MongoDb when using MassTransit to overcome this problem.
author: Lee
image:
canonical: http://blundell89.github.io/data/2016/02/16/sharing-large-message-between-your-services-with-masstransit-and-mongodb.html
---

##Background
Back in the tail end of last year, my team and I were required to implement the ability to upload documents on our company's public facing website.

Our system (at its most basic level) comprises of a website and several microservices (with .NET at the core of everything). The website and services use a message-based architecture to communicate with each other, using the RabbitMQ transport. Between each service/website, MassTransit sits in the middle as the message bus. MassTransit has a super-intuitive API and is really simple to integrate with. This also means that we aren't coupled to RabbitMQ as the transport, as MassTransit makes things really easy to switch (if this was ever required). MongoDb is used as our primary data store.

##Large messages add overhead to your transport
The primary contributor of MassTranit, Chris Patterson, explains [here](https://lostechies.com/chrispatterson/2015/06/16/masstransit-v3-update/) how large messages can clog up your transport therefore affecting the consumption of other messages in your queues. This is where the new `MessageData` feature from MassTransit v3 can help solve this problem. Data can be stored externally to the message body.

Out of the box, MassTransit supports a couple of basic message data repositories, including the file system and in-memory. Our primary data store, MongoDb, was not supported out the box, but the contributors have made it super easy to add a new repository - by simply implementing the `IMessageDataRepository` interface from the MassTransit library.

##Storing large messages in MongoDb (with the help of GridFS)
Our next task was to research the best method to store large documents in MongoDb so we could write our custom implementation.

As you may or may not be aware, MongoDb stores its documents as BSON (Binary JSON) in the background. The maximum size of a single document is 16MB. This ensures that ["*a single document cannot use excessive amount of RAM or, during transmission, excessive amount of bandwidth*"](https://docs.mongodb.org/manual/reference/limits/#limit-bson-document-size). As we could not rule out the possibility that a single document would always be smaller than 16MB (and for other reasons that will follow) we opted to use the GridFS API.

The GridFS API provides consumers with a consistent and flexible way (you can provide metadata as required) of storing documents. By using GridFS you are also no longer limited to the 16MB document size limit that applies to standard documents stored in MongoDb.

Using the GridFS API separates the binary data of your documents from the data that identifies your documents such as the `filename` and `contentType`. This data is separated into two separate collections: `files` and `chunks`. These collections are stored in a `bucket`, where the default name is `fs`. If you were using the default bucket name and wanted to query for a specific file name, you could use the following syntax in your MongoDb shell:

```javascript
db.fs.files.find({"filename" : "MyAwesomeFile.pdf"})
```

The GridFS API is very simple to use and if you want to find out more about it then it's worth having a read over the [documentation](https://docs.mongodb.org/manual/core/gridfs/).

After deciding that we would use the GridFS API we could go ahead and write our implementation (with tests, of course!). The source code for the implementation is freely available on [GitHub](https://github.com/LiberisLabs/MassTransit.MessageData.MongoDb).

##Wiring up MassTransit `MessageData` to MongoDb
###Package installation and creating a repository instance
Firstly you'll need to install the `MassTransit.MessageData.MongoDb` NuGet package by executing the following commandlet:

```powershell
PM> Install-Package MassTranit.MessageData.MongoDb
```

Once the package is installed, you can *new up* a `MongoMessageDataRepository` using one of the following constructors:

```csharp
var repository = new MongoMessageDataRepository(new MongoUrl("mongodb://localhost/masstransitTest"));
```

Or

```csharp
var repository = new MongoMessageDataRepository("mongodb://localhost", "masstransitTest");
```

Now that you have a repository instance, you can send or receive large messages using MongoDb.

###Sending a Big Message
Say we have a BigMessage that has a BigPayload property of type `MessageData<byte[]>`:

```csharp
public class BigMessage
{
    public string SomeProperty1 { get; set; }

    public int SomeProperty2 { get; set; }

    public MessageData<byte[]> BigPayload { get; set; }
}
```

When we create the message we need to call our `MongoMessageDataRepository` to put the big payload into MongoDb, which in turn passes back a `MessageData<byte[]>`:

```csharp
var blob = new byte[] {111, 2, 234, 12, 99};

var bigPayload = await repository.PutBytes(blob);

var message = new BigMessage
{
    SomeProperty1 = "Other property that will get passed on message queue",
    SomeProperty2 = 12,
    BigPayload =  bigPayload
};
```

We can then publish/send it like any other MassTransit message:

```csharp
busControl.Publish(message);
```

###Receiving a Big Message
To receive a message with a big payload we need to configure our endpoint to use the repository for a given message type:

```csharp
var busControl = MassTransit.Bus.Factory.CreateUsingInMemory(cfg =>
{
    cfg.ReceiveEndpoint("my_awesome_endpoint", ep =>
    {
        // Normal Receive Endpoint Config...

        ep.UseMessageData<BigMessage>(repository);
    });
});
```

Then, with the magic wiring from MassTransit we can consume the message inside a consumer with the following:

```csharp
public class BigMessageConsumer : IConsumer<BigMessage>
{
    public async Task Consume(ConsumeContext<BigMessage> context)
    {
        var bigPayload = await context.Message.BigPayload.Value;

        // Do something with the big payload...
    }
}
```

##Cleaning up Expired GridFS Data
Expired GridFS data can be removed by running the following script:

```javascript
var docs = db.getMongo().getDB("masstransit");
var now = new Date().toISOString();

var cursor = docs.fs.files.find({"metadata.expiration" : {$lte : new Date(now)}});

cursor.forEach(function (toDelete) {
    var id = toDelete._id;
    docs.fs.chunks.remove({files_id : id});
    docs.fs.files.remove({_id : id});
});    
```

Alternatively, you can import the `CreateDeleteExpiredMassTransitMessageDataTask.xml` file from our GitHub repository into Windows Task Scheduler and configure the script's arguments so that expired documents are deleted on a schedule.

#Next up, MongoDb Sagas
We are currently working on a new feature that will require the use of [sagas](http://docs.masstransit-project.com/en/latest/overview/keyideas.html#sagas). As with `MessageData`, these do not work out of the box with MongoDb. The implementation is likely to be a little more complicated but I'll make sure that another post is published in a similar fashion. Thanks for reading!
