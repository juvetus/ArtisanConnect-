import { Controller, Get, Post, Patch, Param, Body, Query, DefaultValuePipe, ParseIntPipe, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { OrdersService } from './orders.service.js';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator.js';

@Controller('orders')
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Post('offers')
  async createListingOffer(
    @CurrentUser() user: AuthUser,
    @Body() body: {
      listingId: string;
      quantity: number;
      offeredUnitPrice: number;
      message?: string;
      paymentMethod: 'cash' | 'momo' | 'orange_money';
      deliveryMethod: 'workshop' | 'home' | 'carrier';
      deliveryAddress?: string;
    },
  ) {
    if (user.role !== 'client') throw new ForbiddenException('Seuls les acheteurs peuvent proposer un prix');
    return this.ordersService.createListingOffer(user.id, { ...body, quantity: Number(body.quantity), offeredUnitPrice: Number(body.offeredUnitPrice) });
  }

  @Get('offers/buyer')
  async getBuyerListingOffers(@CurrentUser() user: AuthUser) {
    if (user.role !== 'client') throw new ForbiddenException('Accès réservé aux acheteurs');
    return this.ordersService.getBuyerListingOffers(user.id);
  }

  @Get('offers/seller')
  async getSellerListingOffers(@CurrentUser() user: AuthUser) {
    if (user.role !== 'artisan') throw new ForbiddenException('Accès réservé aux vendeurs');
    return this.ordersService.getSellerListingOffers(user.id);
  }

  @Patch('offers/:id/counter')
  async counterListingOffer(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { unitPrice: number; message?: string },
  ) {
    if (!['client', 'artisan'].includes(user.role)) throw new ForbiddenException('Action réservée à l’acheteur ou au vendeur');
    return this.ordersService.counterListingOffer(user.id, id, { unitPrice: Number(body.unitPrice), message: body.message });
  }

  @Patch('offers/:id/accept')
  async acceptListingOffer(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    if (!['client', 'artisan'].includes(user.role)) throw new ForbiddenException('Action réservée à l’acheteur ou au vendeur');
    return this.ordersService.acceptListingOffer(user.id, id);
  }

  @Patch('offers/:id/reject')
  async rejectListingOffer(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    if (!['client', 'artisan'].includes(user.role)) throw new ForbiddenException('Action réservée à l’acheteur ou au vendeur');
    return this.ordersService.rejectListingOffer(user.id, id);
  }

  @Post()
  async createOrder(
    @CurrentUser() user: AuthUser,
    @Body() body: {
      listingId: string;
      quantity: number;
      paymentMethod?: 'cash' | 'momo' | 'orange_money';
      deliveryMethod?: 'workshop' | 'home' | 'carrier';
      deliveryAddress?: string;
      deliveryLatitude?: number;
      deliveryLongitude?: number;
    },
  ) {
    return this.ordersService.placeOrder(
      user.id,
      body.listingId,
      Number(body.quantity),
      body.paymentMethod ?? 'cash',
      {
        deliveryMethod: body.deliveryMethod ?? 'workshop',
        deliveryAddress: body.deliveryAddress,
        deliveryLatitude: body.deliveryLatitude,
        deliveryLongitude: body.deliveryLongitude,
      },
    );
  }

  @Get(':id')
  async getOrder(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const order = await this.ordersService.findById(id);
    if (!order) throw new NotFoundException('Commande introuvable');
    if (order.buyerId !== user.id && order.sellerId !== user.id) {
      throw new ForbiddenException('Cette commande ne vous concerne pas');
    }
    return order;
  }

  @Get('buyer/:buyerId')
  async getBuyerOrders(
    @CurrentUser() user: AuthUser,
    @Param('buyerId') buyerId: string,
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip: number = 0,
    @Query('take', new DefaultValuePipe(20), ParseIntPipe) take: number = 20,
  ) {
    if (buyerId !== user.id) throw new ForbiddenException('Accès refusé');
    return this.ordersService.findByBuyer(buyerId, skip, take);
  }

  @Get('seller/:sellerId')
  async getSellerOrders(
    @CurrentUser() user: AuthUser,
    @Param('sellerId') sellerId: string,
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip: number = 0,
    @Query('take', new DefaultValuePipe(20), ParseIntPipe) take: number = 20,
  ) {
    if (sellerId !== user.id) throw new ForbiddenException('Accès refusé');
    return this.ordersService.findBySeller(sellerId, skip, take);
  }

  @Patch(':id/status')
  async updateOrderStatus(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { status: 'pending' | 'confirmed' | 'completed' | 'cancelled' },
  ) {
    const order = await this.ordersService.findById(id);
    if (!order) throw new NotFoundException('Commande introuvable');

    const isSeller = order.sellerId === user.id;
    const isBuyer = order.buyerId === user.id;
    if (!isSeller && !isBuyer) throw new ForbiddenException('Cette commande ne vous concerne pas');

    // L'acheteur peut uniquement annuler ; le vendeur pilote le reste du cycle de vie.
    if (!isSeller && body.status !== 'cancelled') {
      throw new ForbiddenException("Seul l'artisan peut faire évoluer ce statut");
    }
    if (isBuyer && !isSeller && order.status !== 'pending') {
      throw new BadRequestException('Cette commande ne peut plus être annulée');
    }

    return this.ordersService.updateStatus(id, body.status);
  }
}


