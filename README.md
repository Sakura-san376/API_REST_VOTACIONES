# Voting API

## Descripción

Esta API permite gestionar votantes, candidatos y votos en un sistema de votación. Implementa los principios **RESTful** con autenticación básica y soporte para **paginación** y **filtrado** en las listas de votantes y candidatos.

## Funcionalidades

### Votantes

* **POST** `/api/voters`: Registrar un nuevo votante.
* **GET** `/api/voters`: Obtener la lista de votantes con soporte para paginación y filtrado.
* **GET** `/api/voters/{id}`: Obtener detalles de un votante por ID.
* **DELETE** `/api/voters/{id}`: Eliminar un votante (si no ha emitido un voto).

### Candidatos

* **POST** `/api/candidates`: Registrar un nuevo candidato.
* **GET** `/api/candidates`: Obtener la lista de candidatos con soporte para paginación y filtrado.
* **GET** `/api/candidates/{id}`: Obtener detalles de un candidato por ID.
* **DELETE** `/api/candidates/{id}`: Eliminar un candidato (si no tiene votos registrados).

### Votos

* **POST** `/api/votes`: Emitir un voto.
* **GET** `/api/votes`: Obtener la lista de votos emitidos.
* **GET** `/api/votes/statistics`: Obtener estadísticas de la votación (total de votos, porcentaje por candidato, total de votantes que han votado).

## Requisitos

* Node.js
* MySQL
* Dependencias:

  * express
  * mysql2
  * dotenv
  * basic-auth
  * swagger-ui-express
  * yamljs

## Instalación

1. **Clonar el repositorio**:

   ```bash
   git clone https://github.com/tu_usuario/voting-api.git
   ```

2. **Instalar las dependencias**:

   ```bash
   cd voting-api
   npm install
   ```

3. **Configurar MySQL**:

   * Crea una base de datos `voting_app`.
   * Ejecuta el script SQL para crear las tablas:

     ```sql


     CREATE DATABASE IF NOT EXISTS voting_app CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

     USE voting_app;

     -- Tabla Voter
     CREATE TABLE IF NOT EXISTS voter (
  	  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  	  name VARCHAR(120) NOT NULL,
  	  email VARCHAR(160) NOT NULL,
  	  has_voted TINYINT(1) NOT NULL DEFAULT 0,
  	  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  	  PRIMARY KEY (id),
  	  UNIQUE KEY uq_voter_email (email)
	  )  ENGINE=InnoDB;

     -- Tabla Candidate
     CREATE TABLE IF NOT EXISTS candidate (
  	  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  	  name VARCHAR(120) NOT NULL,
  	  party VARCHAR(120) NULL,
  	  votes INT UNSIGNED NOT NULL DEFAULT 0,
  	  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  	  PRIMARY KEY (id)
	  ) ENGINE=InnoDB;

     -- Tabla Vote
     CREATE TABLE IF NOT EXISTS vote (
  	  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  	  voter_id INT UNSIGNED NOT NULL,
  	  candidate_id INT UNSIGNED NOT NULL,
  	  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  	  PRIMARY KEY (id),
  	  CONSTRAINT fk_vote_voter FOREIGN KEY (voter_id) REFERENCES voter(id)
    	ON DELETE RESTRICT ON UPDATE CASCADE,
  	  CONSTRAINT fk_vote_candidate FOREIGN KEY (candidate_id) REFERENCES candidate(id)
    	ON DELETE RESTRICT ON UPDATE CASCADE,
  	  -- Para garantizar que un votante solo tenga UN voto:
  	  UNIQUE KEY uq_vote_voter (voter_id)
	  ) ENGINE=InnoDB;
   
     ```

5. **Configurar variables de entorno**:
   Crea un archivo `.env` en la raíz del proyecto con las siguientes variables:

   ```env
   NODE_ENV=development
   PORT=3000
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=tu_password
   DB_NAME=voting_app
   ```

   **Nota**: Cambia `tu_password` por la contraseña de tu base de datos.

## Ejecución

1. **Iniciar el servidor**:

   ```bash
   npm run dev
   ```

   Esto levantará el servidor en `http://localhost:3000`.

2. **Acceder a Swagger UI**:

   * Navega a `http://localhost:3000/docs` para interactuar con la API usando **Swagger UI**.
   * Puedes probar los endpoints de la API directamente desde la interfaz.

## Endpoints de la API

### Votantes

* **POST** `/api/voters`: Registrar un nuevo votante.

  * Cuerpo:

    ```json
    {
      "name": "Ana Pérez",
      "email": "ana@example.com"
    }
    ```

* **GET** `/api/voters`: Obtener la lista de votantes (con paginación y filtrado).

  * Parámetros:

    * `page`: Página (por defecto 1)
    * `limit`: Límites por página (por defecto 10)
    * `name`: Filtrar por nombre
    * `email`: Filtrar por correo electrónico

* **GET** `/api/voters/{id}`: Obtener detalles de un votante por ID.

* **DELETE** `/api/voters/{id}`: Eliminar un votante.

### Candidatos

* **POST** `/api/candidates`: Registrar un nuevo candidato.

  * Cuerpo:

    ```json
    {
      "name": "Carlos Ríos",
      "party": "Partido Azul"
    }
    ```

* **GET** `/api/candidates`: Obtener la lista de candidatos (con paginación y filtrado).

  * Parámetros:

    * `page`: Página (por defecto 1)
    * `limit`: Límites por página (por defecto 10)
    * `name`: Filtrar por nombre
    * `party`: Filtrar por partido

* **GET** `/api/candidates/{id}`: Obtener detalles de un candidato por ID.

* **DELETE** `/api/candidates/{id}`: Eliminar un candidato.

### Votos

* **POST** `/api/votes`: Emitir un voto.

  * Cuerpo:

    ```json
    {
      "voter_id": 1,
      "candidate_id": 2
    }
    ```

* **GET** `/api/votes`: Obtener la lista de votos emitidos.

* **GET** `/api/votes/statistics`: Obtener estadísticas de la votación:

  * Total de votos por candidato.
  * Porcentaje de votos por candidato.
  * Total de votantes que han votado.

## Autenticación

### Autenticación Básica

* Para las rutas protegidas (`/api/voters`, `/api/candidates`, `/api/votes`), la **autenticación básica** es requerida. Debes enviar el **usuario** y **contraseña** en el encabezado `Authorization`:

  * **Username**: `admin` 
  * **Password**: `admin123`

