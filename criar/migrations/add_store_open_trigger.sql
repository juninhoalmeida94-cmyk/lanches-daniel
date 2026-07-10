-- Migration: add check_store_open function and trigger on orders
-- Ajuste nomes de tabelas/colunas conforme seu schema antes de aplicar.

-- Função que valida se a loja está aberta
CREATE OR REPLACE FUNCTION check_store_open()
RETURNS trigger AS $$
DECLARE
  v_open boolean;
BEGIN
  SELECT store_open INTO v_open
    FROM stores
   WHERE id = NEW.store_id;

  IF v_open IS NULL THEN
    RAISE EXCEPTION 'Loja não encontrada (id=%).', NEW.store_id;
  END IF;

  IF NOT v_open THEN
    RAISE EXCEPTION 'Loja fechada: operação não permitida enquanto store_open = false';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger que executa a checagem antes de inserir ou atualizar pedidos
DROP TRIGGER IF EXISTS trg_check_store_open ON orders;
CREATE TRIGGER trg_check_store_open
BEFORE INSERT OR UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION check_store_open();
