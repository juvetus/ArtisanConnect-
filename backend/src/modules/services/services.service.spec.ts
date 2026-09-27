import { ServicesService } from './services.service.js';

describe('ServicesService public catalog', () => {
  const builder = {
    leftJoinAndSelect: vi.fn(),
    where: vi.fn(),
    andWhere: vi.fn(),
    addSelect: vi.fn(),
    orderBy: vi.fn(),
    addOrderBy: vi.fn(),
    take: vi.fn(),
    skip: vi.fn(),
    getMany: vi.fn(),
  };
  const servicesRepository = { createQueryBuilder: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    servicesRepository.createQueryBuilder.mockReturnValue(builder);
    for (const method of ['leftJoinAndSelect', 'where', 'andWhere', 'addSelect', 'orderBy', 'addOrderBy', 'take', 'skip']) {
      (builder[method as keyof typeof builder] as ReturnType<typeof vi.fn>).mockReturnValue(builder);
    }
    builder.getMany.mockResolvedValue([]);
  });

  const createService = () => new ServicesService(
    servicesRepository as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  );

  it('exclut les services démo du catalogue réel', async () => {
    const service = createService();

    await service.getApprovedServices();

    expect(builder.andWhere).toHaveBeenCalledWith('service.isDemo = :isDemo', { isDemo: false });
  });

  it('conserve les services démo dans le catalogue de démonstration', async () => {
    const originalDemoMode = process.env.DEMO_MODE;
    process.env.DEMO_MODE = 'true';

    try {
      await createService().getApprovedServices();
      expect(builder.andWhere).not.toHaveBeenCalledWith('service.isDemo = :isDemo', { isDemo: false });
    } finally {
      if (originalDemoMode === undefined) delete process.env.DEMO_MODE;
      else process.env.DEMO_MODE = originalDemoMode;
    }
  });
});