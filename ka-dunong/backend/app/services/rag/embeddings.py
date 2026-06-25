from sentence_transformers import SentenceTransformer

from app.config import Settings


class EmbeddingService:
    def __init__(self, settings: Settings):
        self.model = SentenceTransformer(settings.rag_embedding_model)
        self.dimension = self.model.get_sentence_embedding_dimension()

    def embed_texts(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []
        vectors = self.model.encode(texts, normalize_embeddings=True)
        return vectors.tolist()

    def embed_query(self, text: str) -> list[float]:
        return self.embed_texts([text])[0]
