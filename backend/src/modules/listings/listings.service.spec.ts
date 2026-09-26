import { ListingsService } from './listings.service.js';

describe('ListingsService catalog availability sorting', () => {
  const builder = {
    leftJoinAndSelect: vi.fn(),
    where: vi.fn(),
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
    for (const method of ['leftJoinAndSelect', 'where', 'addSelect', 'orderBy', 'addOrderBy', 'skip', 'take']) {
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
  });
});
