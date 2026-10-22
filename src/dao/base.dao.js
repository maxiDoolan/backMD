// DAO genérico: operaciones de acceso a datos sobre un modelo de Mongoose.
// Los DAO de cada entidad lo extienden y son los ÚNICOS que importan modelos.
// Devuelven objetos planos (lean), sin lógica de negocio.
export class BaseDAO {
    constructor(model) {
        this.model = model;
    }

    #apply(query, { select, sort, skip, limit, populate } = {}) {
        if (select) query.select(select);
        if (sort) query.sort(sort);
        if (skip) query.skip(skip);
        if (limit) query.limit(limit);
        for (const p of [].concat(populate ?? [])) query.populate(p);
        return query.select("-__v").lean();
    }

    findById(id, options) {
        return this.#apply(this.model.findById(id), options);
    }

    findOne(filter, options) {
        return this.#apply(this.model.findOne(filter), options);
    }

    find(filter = {}, options) {
        return this.#apply(this.model.find(filter), options);
    }

    count(filter = {}) {
        return this.model.countDocuments(filter);
    }

    // Suma un campo numérico de los documentos que cumplen el filtro
    async sum(filter, field) {
        const query = this.model.find(filter);
        query.cast(this.model); // castea ids (string → ObjectId) como haría find()
        const [result] = await this.model.aggregate([
            { $match: query.getFilter() },
            { $group: { _id: null, total: { $sum: `$${field}` } } },
        ]);
        return result?.total ?? 0;
    }

    async create(data) {
        const doc = await this.model.create(data);
        const { __v, ...plain } = doc.toObject();
        return plain;
    }

    update(id, changes, options) {
        return this.#apply(
            this.model.findByIdAndUpdate(id, changes, { new: true, runValidators: true }),
            options
        );
    }
}
