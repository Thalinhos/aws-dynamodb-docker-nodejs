const express = require('express');
const router = express.Router();
const { DynamoDBClient, PutItemCommand, GetItemCommand, QueryCommand, ScanCommand } = require("@aws-sdk/client-dynamodb");
const { v4: uuidv4 } = require('uuid');

// const client = new DynamoDBClient({
//     region: 'local',
//     endpoint: 'http://localhost:8000',  // URL do DynamoDB local
//     credentials: {
//       accessKeyId: 'fakeMyKeyId',      // Pode ser qualquer coisa no local
//       secretAccessKey: 'fakeSecretKey'
//     }
//   });

const client = new DynamoDBClient({
    region: 'us-east-2',
    credentials: {
      accessKeyId: 'xxxxxxxxxxx',
      secretAccessKey: 'xxxxxxx'
    }
  });

function marshall(obj) {
  const { marshall } = require("@aws-sdk/util-dynamodb");
  return marshall(obj);
}

function unmarshall(item) {
  const { unmarshall } = require("@aws-sdk/util-dynamodb");
  return unmarshall(item);
}

// --- Usuários ---

// Criar usuário
router.post('/users', async (req, res) => {
  try {
    const { nome, email } = req.body;
    if (!nome || !email) return res.status(400).json({ error: 'nome e email são obrigatórios' });

    const user = {
      usersId: uuidv4(),
      nome,
      email,
      criadoEm: new Date().toISOString()
    };

    const params = {
      TableName: 'Users',
      Item: marshall(user)
    };

    await client.send(new PutItemCommand(params));
    res.status(201).json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar usuário' });
  }
});

router.get('/users', async (req, res) => {
    try {
      const params = {
        TableName: 'Users'
      };
  
      const { Items } = await client.send(new ScanCommand(params));
      const users = Items.map(unmarshall);
      res.json(users);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Erro ao listar usuários' });
    }
})

// Buscar usuário por ID
router.get('/users/:usersId', async (req, res) => {
  try {
    const { usersId } = req.params;

    const params = {
      TableName: 'Users',
      Key: marshall({ usersId })
    };

    const { Item } = await client.send(new GetItemCommand(params));

    if (!Item) return res.status(404).json({ error: 'Usuário não encontrado' });

    const user = unmarshall(Item);
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar usuário' });
  }
});

// Buscar usuário por email (query no índice secundário)
router.get('/users/email/:email', async (req, res) => {
  try {
    const { email } = req.params;

    const params = {
      TableName: 'Users',
      IndexName: 'email-index',
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: marshall({ ':email': email })
    };

    const { Items } = await client.send(new QueryCommand(params));

    if (!Items || Items.length === 0) return res.status(404).json({ error: 'Usuário não encontrado' });

    const user = unmarshall(Items[0]);
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar usuário por email' });
  }
});

// --- Posts ---

// Criar post
router.post('/posts', async (req, res) => {
  try {
    const { usersId, conteudo } = req.body;
    if (!usersId || !conteudo) return res.status(400).json({ error: 'userId e conteudo são obrigatórios' });

    const post = {
      postId: uuidv4(),
      usersId: usersId,
      conteudo,
      criadoEm: new Date().toISOString()
    };

    const params = {
      TableName: 'Posts',
      Item: marshall(post)
    };

    await client.send(new PutItemCommand(params));
    res.status(201).json(post);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar post' });
  }
});

// Listar posts do usuário
router.get('/posts/user/:usersId', async (req, res) => {
    try {
      const { usersId } = req.params;
  
      const params = {
        TableName: 'Posts',
        IndexName: 'usersId-index', // Nome do seu GSI
        KeyConditionExpression: 'usersId = :uid',
        ExpressionAttributeValues: marshall({
          ':uid': usersId
        })
      };
  
      const { Items } = await client.send(new QueryCommand(params));
      const posts = Items.map(unmarshall);
      res.json(posts);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Erro ao listar posts' });
    }
  });

module.exports = router;
