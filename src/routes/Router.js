import express from 'express';
import UsersController from '../controller/UsersController.js';
import AgamaController from '../controller/AgamaController.js';
import { AuthMiddleware } from '../middleware/AuthMiddleware.js';

const Router = express.Router();
Router.use(AuthMiddleware);

// USERS
Router.get('/api/users', UsersController.GetUserController);
Router.delete('/api/users/logout', UsersController.LogoutUserController);
Router.put('/api/users/:userId', UsersController.UpdateUserController);

// AGAMA
Router.get('/api/agama', AgamaController.GetAgamaController);
Router.post('/api/agama', AgamaController.CreateAgamaController);
Router.get('/api/agama/:agamaId', AgamaController.GetAgamaByIdController);
Router.put('/api/agama/:agamaId', AgamaController.UpdateAgamaController);
Router.delete('/api/agama/:agamaId', AgamaController.DeleteAgamaController);

export { Router };
