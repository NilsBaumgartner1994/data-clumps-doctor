.PHONY: all build run clean

# Default value for the DIRECTORY variable
SOURCE := ./testSrc/java
DESTINATION := ./../testDataParsedAst/testSrc
IGNORE_DUBLICATE_DEFINITION := true
IGNORE_WILDCARD_IMPORTS := true
GENERATE_REFERENCES_OF_FIELDS_AND_METHODS := true

# Determine the appropriate remove command based on the operating system
ifeq ($(OS),Windows_NT)
    RM := rmdir /s /q
else
    RM := rm -rf
endif

all: clean build run

setup:
	./mvnw clean install

build:
	mvn install:install-file -Dfile=./pmd-bin-7.0.0-rc3/lib/pmd-ui-7.0.0-rc1.jar -DgroupId=net.sourceforge.pmd -DartifactId=pmd-ui -Dversion=7.0.0-SNAPSHOT -Dpackaging=jar || true
	./mvnw clean install
	unzip -o ./pmd-java-dist/target/pmd-java-bin-1.0.0-SNAPSHOT.zip -d ./pmd-java-dist/target/
	cp ./pmd-java-dist/target/pmd-java-bin-1.0.0-SNAPSHOT/lib/pmd-java-custom-1.0.0-SNAPSHOT.jar ./pmd-bin-7.0.0-rc3/lib/
	cp ./pmd-java-dist/target/pmd-java-bin-1.0.0-SNAPSHOT/lib/jackson-annotations-2.12.3.jar ./pmd-bin-7.0.0-rc3/lib/
	cp ./pmd-java-dist/target/pmd-java-bin-1.0.0-SNAPSHOT/lib/jackson-core-2.12.3.jar ./pmd-bin-7.0.0-rc3/lib/
	cp ./pmd-java-dist/target/pmd-java-bin-1.0.0-SNAPSHOT/lib/jackson-databind-2.12.3.jar ./pmd-bin-7.0.0-rc3/lib/

run:
	@echo "Start time: $$(date)"; \
	START_TIME=$$(date +%s); \
	export DESTINATION="$(DESTINATION)"; \
	export SOURCE="$(SOURCE)"; \
	export IGNORE_DUBLICATE_DEFINITION=$(IGNORE_DUBLICATE_DEFINITION); \
	export GENERATE_REFERENCES_OF_FIELDS_AND_METHODS=$(GENERATE_REFERENCES_OF_FIELDS_AND_METHODS); \
	export IGNORE_WILDCARD_IMPORTS=$(IGNORE_WILDCARD_IMPORTS); \
	$(RM) "$(DESTINATION)"; \
	./pmd-bin-7.0.0-rc3/bin/pmd check -d "$(SOURCE)" -f text -R custom-java-ruleset.xml; \
	echo "End time: $$(date)"; \
	END_TIME=$$(date +%s); \
	ELAPSED_TIME=$$((END_TIME - START_TIME)); \
	echo "Elapsed time: $$ELAPSED_TIME seconds"


clean:
ifeq ($(OS),Windows_NT)
	$(RM) -rf ./pmd-java-dist/target/
	$(RM) -rf ./pmd-java-custom/target/
else
	sudo chown -R $(shell whoami) ./pmd-java-dist/target/ || true
	chmod -R u+w ./pmd-java-dist/target/ || true
	$(RM) -rf ./pmd-java-dist/target/ || sudo rm -rf ./pmd-java-dist/target/
	sudo chown -R $(shell whoami) ./pmd-java-custom/target/ || true
	chmod -R u+w ./pmd-java-custom/target/ || true
	$(RM) -rf ./pmd-java-custom/target/ || sudo rm -rf ./pmd-java-custom/target/
endif

designer:
	@echo "Starting PMD designer..."
	JAVAFX_HOME=/Users/nbaumgartner/Library/Java/JavaVirtualMachines/javafx-sdk-17.0.7 pmd-bin-7.0.0-rc3/bin/pmd designer
