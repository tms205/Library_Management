--liquibase formatted sql

--changeset manh:013-1
--preconditions onFail:MARK_RAN
--precondition-sql-check expectedResult:0 SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'books' AND column_name = 'image'
ALTER TABLE books ADD COLUMN image VARCHAR(1000) NULL AFTER published_date;

--changeset manh:013-2
UPDATE books SET image = 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=600&q=80' WHERE id = 1;
UPDATE books SET image = 'https://images.unsplash.com/photo-1532012164546-f432f2e3edd4?auto=format&fit=crop&w=600&q=80' WHERE id = 2;
UPDATE books SET image = 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80' WHERE id = 3;
UPDATE books SET image = 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=600&q=80' WHERE id = 4;
UPDATE books SET image = 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=600&q=80' WHERE id = 5;
UPDATE books SET image = 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=600&q=80' WHERE id = 6;
UPDATE books SET image = 'https://images.unsplash.com/photo-1607799279861-4dd421887fb3?auto=format&fit=crop&w=600&q=80' WHERE id = 7;
UPDATE books SET image = 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=600&q=80' WHERE id = 8;
UPDATE books SET image = 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?auto=format&fit=crop&w=600&q=80' WHERE id = 9;
UPDATE books SET image = 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=600&q=80' WHERE id = 10;
UPDATE books SET image = 'https://images.unsplash.com/photo-1489875347897-49f64b51c1f8?auto=format&fit=crop&w=600&q=80' WHERE id = 11;
UPDATE books SET image = 'https://images.unsplash.com/photo-1516259762381-22954d7d3ad2?auto=format&fit=crop&w=600&q=80' WHERE id = 12;
UPDATE books SET image = 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=600&q=80' WHERE id = 13;
UPDATE books SET image = 'https://images.unsplash.com/photo-1605745341112-85968b19335b?auto=format&fit=crop&w=600&q=80' WHERE id = 14;
UPDATE books SET image = 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?auto=format&fit=crop&w=600&q=80' WHERE id = 15;
UPDATE books SET image = 'https://images.unsplash.com/photo-1504639725590-34d0984388bd?auto=format&fit=crop&w=600&q=80' WHERE id = 16;
UPDATE books SET image = 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=600&q=80' WHERE id = 18;
UPDATE books SET image = 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=600&q=80' WHERE id = 30;
UPDATE books SET image = 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=600&q=80' WHERE id = 31;
UPDATE books SET image = 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?auto=format&fit=crop&w=600&q=80' WHERE id = 32;
UPDATE books SET image = 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=600&q=80' WHERE id = 33;
UPDATE books SET image = 'https://images.unsplash.com/photo-1607799279861-4dd421887fb3?auto=format&fit=crop&w=600&q=80' WHERE id = 34;
UPDATE books SET image = 'https://images.unsplash.com/photo-1580894732454-defbe5f7ff64?auto=format&fit=crop&w=600&q=80' WHERE id = 35;
UPDATE books SET image = 'https://images.unsplash.com/photo-1532012164546-f432f2e3edd4?auto=format&fit=crop&w=600&q=80' WHERE id = 36;
UPDATE books SET image = 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?auto=format&fit=crop&w=600&q=80' WHERE id = 37;
UPDATE books SET image = 'https://images.unsplash.com/photo-1516259762381-22954d7d3ad2?auto=format&fit=crop&w=600&q=80' WHERE id = 38;
UPDATE books SET image = 'https://images.unsplash.com/photo-1489875347897-49f64b51c1f8?auto=format&fit=crop&w=600&q=80' WHERE id = 39;
UPDATE books SET image = 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?auto=format&fit=crop&w=600&q=80' WHERE id = 40;
UPDATE books SET image = 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=600&q=80' WHERE id = 41;
UPDATE books SET image = 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=600&q=80' WHERE id = 42;
UPDATE books SET image = 'https://images.unsplash.com/photo-1605745341112-85968b19335b?auto=format&fit=crop&w=600&q=80' WHERE id = 43;
UPDATE books SET image = 'https://images.unsplash.com/photo-1618401471353-b98aedd04e11?auto=format&fit=crop&w=600&q=80' WHERE id = 44;
UPDATE books SET image = 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?auto=format&fit=crop&w=600&q=80' WHERE id = 45;
UPDATE books SET image = 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=600&q=80' WHERE id = 46;
UPDATE books SET image = 'https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=600&q=80' WHERE id = 47;
UPDATE books SET image = 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=600&q=80' WHERE id = 48;
UPDATE books SET image = 'https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=600&q=80' WHERE id = 49;
UPDATE books SET image = 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=600&q=80' WHERE id = 50;
UPDATE books SET image = 'https://images.unsplash.com/photo-1629654297299-c8506221ca97?auto=format&fit=crop&w=600&q=80' WHERE id = 51;
UPDATE books SET image = 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=600&q=80' WHERE id = 52;

-- Gán ảnh mặc định cho bất kỳ cuốn sách nào chưa có ảnh
UPDATE books SET image = 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80' WHERE image IS NULL;
