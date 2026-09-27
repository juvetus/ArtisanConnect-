import { BadRequestException } from '@nestjs/common';
import { ListingsService } from './listings.service.js';

describe('ListingsService catalog availability sorting', () => {
  const builder = {
    leftJoinAndSelect: vi.fn(),
    where: vi.fn(),
    andWhere: vi.fn(),
    addSelect: vi.fn(),
    orderBy: vi.fn(),
    addOrderBy: vi.fn(),
    skip: vi.fn(),
    take: vi.fn(),
    getManyAndCount: vi.fn().mockResolvedValue([[], 0]),
  };
  const repository = { createQueryBuilder: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    repository.createQueryBuilder.mockReturnValue(builder);
    for (const method of ['leftJoinAndSelect', 'where', 'andWhere', 'addSelect', 'orderBy', 'addOrderBy', 'skip', 'take']) {
      (builder[method as keyof typeof builder] as ReturnType<typeof vi.fn>).mockReturnValue(builder);
    }
    builder.getManyAndCount.mockResolvedValue([[], 0]);
  });

  it('ranks out-of-stock products last before sponsorship and date ordering', async () => {
    const service = new ListingsService(repository as never);

    await service.searchCatalog({});

    expect(builder.addSelect).toHaveBeenNthCalledWith(
      1,
      "CASE WHEN listing.type = 'product' AND listing.stock <= 0 THEN 1 ELSE 0 END",
      'stock_rank',
    );
    expect(builder.orderBy).toHaveBeenCalledWith('stock_rank', 'ASC');
    expect(builder.addOrderBy).toHaveBeenNthCalledWith(1, 'sponsor_rank', 'ASC');
    expect(builder.addOrderBy).toHaveBeenNthCalledWith(2, 'listing.createdAt', 'DESC');
    expect(builder.andWhere).toHaveBeenCalledWith('listing.isDemo = :isDemo', { isDemo: false });
  });

  it('refuse une catégorie incompatible avant de créer une annonce', async () => {
    const create = vi.fn();
    const save = vi.fn();
    const service = new ListingsService({ create, save } as never);

    await expect(service.create({ type: 'product', category: 'plomberie' })).rejects.toBeInstanceOf(BadRequestException);
    expect(create).not.toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
  });

  it('refuse de modifier une annonce vers une catégorie incompatible', async () => {
    const save = vi.fn();
    const service = new ListingsService({
      findOne: vi.fn().mockResolvedValue({ id: 'listing-1', type: 'product', category: 'vannerie' }),
      save,
    } as never);

    await expect(service.update('listing-1', { category: 'plomberie' })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.update('listing-1', { category: null as never })).rejects.toBeInstanceOf(BadRequestException);
    expect(save).not.toHaveBeenCalled();
  });
});
